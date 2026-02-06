const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const ping = require('ping');
const net = require('net');
const session = require('express-session');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const { sequelize, User, Device, Service, DowntimeLog, LatencyLog, Setting } = require('./models');
const { DataTypes } = require('sequelize');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const KIOSK_LAYOUT_FILE = path.join(__dirname, 'kiosk-layout.json');

app.use(express.json());
app.use(express.static('public'));
app.use(session({
    secret: 'nodepulse-secret-key', // Change this in production
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Auth Middleware
const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'Admin') {
        next();
    } else {
        res.status(403).json({ error: 'Access denied' });
    }
};

const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// --- API ROUTES ---

// Kiosk Layout API
app.get('/api/kiosk/layout', isAuthenticated, async (req, res) => {
    try {
        const data = await fs.readFile(KIOSK_LAYOUT_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'Kiosk layout not found' });
        } else {
            console.error('Error reading kiosk layout file:', error);
            res.status(500).json({ error: 'Failed to load kiosk layout' });
        }
    }
});

app.post('/api/kiosk/layout', isAuthenticated, async (req, res) => {
    try {
        const layout = req.body;
        await fs.writeFile(KIOSK_LAYOUT_FILE, JSON.stringify(layout, null, 2), 'utf8');
        res.json({ success: true, message: 'Kiosk layout saved successfully' });
    } catch (error) {
        console.error('Error writing kiosk layout file:', error);
        res.status(500).json({ error: 'Failed to save kiosk layout' });
    }
});

// Check if setup is needed
app.get('/api/setup-status', async (req, res) => {
    const adminCount = await User.count({ where: { role: 'Admin' } });
    res.json({ setupRequired: adminCount === 0 });
});

// Setup admin
app.post('/api/setup', async (req, res) => {
    const adminCount = await User.count({ where: { role: 'Admin' } });
    if (adminCount > 0) return res.status(400).json({ error: 'Setup already completed' });

    const { username, password } = req.body;
    const password_hash = await bcrypt.hash(password, 10);
    await User.create({ username, password_hash, role: 'Admin' });
    res.json({ success: true });
});

// Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ where: { username } });
    if (user && await bcrypt.compare(password, user.password_hash)) {
        req.session.user = { id: user.id, username: user.username, role: user.role };
        res.json({ user: req.session.user });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// --- USER MANAGEMENT API ---

app.get('/api/users', isAdmin, async (req, res) => {
    const users = await User.findAll({ attributes: { exclude: ['password_hash'] } });
    res.json(users);
});

app.post('/api/users', isAdmin, async (req, res) => {
    const { username, password, role } = req.body;
    try {
        const password_hash = await bcrypt.hash(password, 10);
        const user = await User.create({ username, password_hash, role });
        res.json({ id: user.id, username: user.username, role: user.role });
    } catch (err) {
        res.status(400).json({ error: 'Username already exists' });
    }
});

app.put('/api/users/:id', isAdmin, async (req, res) => {
    const { username, password, role } = req.body;
    const updateData = { username, role };
    if (password) {
        updateData.password_hash = await bcrypt.hash(password, 10);
    }
    try {
        await User.update(updateData, { where: { id: req.params.id } });
        const updatedUser = await User.findByPk(req.params.id, { attributes: { exclude: ['password_hash'] } });
        res.json(updatedUser);
    } catch (err) {
        res.status(400).json({ error: 'Update failed' });
    }
});

app.delete('/api/users/:id', isAdmin, async (req, res) => {
    const adminCount = await User.count({ where: { role: 'Admin' } });
    const userToDelete = await User.findByPk(req.params.id);
    
    if (userToDelete && userToDelete.role === 'Admin' && adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot delete the only admin' });
    }
    
    if (req.session.user.id === parseInt(req.params.id)) {
        return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    await User.destroy({ where: { id: req.params.id } });
    res.json({ success: true });
});

// Get current user
app.get('/api/me', (req, res) => {
    res.json(req.session.user || null);
});

// --- SETTINGS API ---
app.get('/api/settings', isAdmin, async (req, res) => {
    const settings = await Setting.findAll();
    const settingsObj = {};
    settings.forEach(s => settingsObj[s.key] = s.value);
    res.json(settingsObj);
});

app.post('/api/settings', isAdmin, async (req, res) => {
    const settings = req.body;
    for (const [key, value] of Object.entries(settings)) {
        await Setting.upsert({ key, value: String(value) });
    }
    res.json({ success: true });
});

// --- HISTORY API ---
app.get('/api/devices/:id/history', isAuthenticated, async (req, res) => {
    const history = await DowntimeLog.findAll({
        where: { DeviceId: req.params.id },
        order: [['down_at', 'DESC']],
        limit: 50
    });
    res.json(history);
});

app.get('/api/devices/:id/latency', isAuthenticated, async (req, res) => {
    const history = await LatencyLog.findAll({
        where: { DeviceId: req.params.id },
        order: [['timestamp', 'DESC']],
        limit: 50
    });
    res.json(history.reverse());
});

app.get('/api/services/:id/history', isAuthenticated, async (req, res) => {
    const history = await DowntimeLog.findAll({
        where: { ServiceId: req.params.id },
        order: [['down_at', 'DESC']],
        limit: 50
    });
    res.json(history);
});

app.get('/api/services/:id/latency', isAuthenticated, async (req, res) => {
    const history = await LatencyLog.findAll({
        where: { ServiceId: req.params.id },
        order: [['timestamp', 'DESC']],
        limit: 50
    });
    res.json(history.reverse());
});

// Device CRUD
app.get('/api/devices', isAuthenticated, async (req, res) => {
    const devices = await Device.findAll({ include: Service });
    res.json(devices);
});

app.post('/api/devices', isAdmin, async (req, res) => {
    const { name, ip_address, type, ping_interval, services } = req.body;
    const device = await Device.create({ name, ip_address, type, ping_interval: parseInt(ping_interval) || 10 });
    if (services && Array.isArray(services)) {
        for (const s of services) {
            await Service.create({ ...s, DeviceId: device.id });
        }
    }
    const fullDevice = await Device.findByPk(device.id, { include: Service });
    const deviceState = formatDeviceForScan(fullDevice);
    monitoredDevices[device.id] = deviceState;
    startTrackingDevice(deviceState);
    io.emit('device-added', deviceState);
    res.json(fullDevice);
});

app.put('/api/devices/:id', isAdmin, async (req, res) => {
    const { name, ip_address, type, ping_interval, services } = req.body;
    await Device.update({ name, ip_address, type, ping_interval: parseInt(ping_interval) || 10 }, { where: { id: req.params.id } });
    
    stopTrackingDevice(req.params.id);

    await Service.destroy({ where: { DeviceId: req.params.id } });
    if (services && Array.isArray(services)) {
        for (const s of services) {
            await Service.create({ ...s, DeviceId: req.params.id });
        }
    }
    
    const updatedDevice = await Device.findByPk(req.params.id, { include: Service });
    const deviceState = formatDeviceForScan(updatedDevice);
    monitoredDevices[req.params.id] = deviceState;
    startTrackingDevice(deviceState);
    io.emit('device-updated', deviceState);
    res.json(updatedDevice);
});

app.delete('/api/devices/:id', isAdmin, async (req, res) => {
    stopTrackingDevice(req.params.id);
    await Device.destroy({ where: { id: req.params.id } });
    delete monitoredDevices[req.params.id];
    io.emit('device-deleted', req.params.id);
    res.json({ success: true });
});

// --- MONITORING LOGIC ---

let monitoredDevices = {};
let trackers = {};

async function sendEmail(subject, text) {
    const settings = await Setting.findAll();
    const s = {};
    settings.forEach(item => s[item.key] = item.value);

    if (!s.smtp_host || !s.smtp_user || !s.smtp_pass || !s.alert_email) return;

    const transporter = nodemailer.createTransport({
        host: s.smtp_host,
        port: parseInt(s.smtp_port) || 587,
        secure: s.smtp_port == 465,
        auth: {
            user: s.smtp_user,
            pass: s.smtp_pass
        }
    });

    try {
        await transporter.sendMail({
            from: `"NodePulse" <${s.smtp_user}>`,
            to: s.alert_email,
            subject: `[NodePulse] ${subject}`,
            text: text
        });
        console.log(`Email alert sent: ${subject}`);
    } catch (err) {
        console.error('Email failed:', err);
    }
}

function formatDeviceForScan(dbDevice) {
    return {
        id: dbDevice.id,
        name: dbDevice.name,
        ip: dbDevice.ip_address,
        type: dbDevice.type,
        pingInterval: dbDevice.ping_interval || 10,
        status: dbDevice.last_status || 'unknown',
        latency: null,
        lastUpdate: null,
        services: (dbDevice.Services || []).map(s => ({
            id: s.id,
            name: s.service_name,
            port: s.port_number,
            status: s.last_status || 'unknown',
            interval: s.check_interval || 60
        }))
    };
}

async function loadDevices() {
    const devices = await Device.findAll({ include: Service });
    monitoredDevices = {};
    Object.keys(trackers).forEach(stopTrackingDevice);
    
    devices.forEach(d => {
        const deviceState = formatDeviceForScan(d);
        monitoredDevices[d.id] = deviceState;
        startTrackingDevice(deviceState);
    });
}

function startTrackingDevice(device) {
    if (!trackers[device.id]) trackers[device.id] = {};
    
    const deviceInterval = setInterval(() => scanDeviceICMP(device.id), (device.pingInterval || 10) * 1000);
    trackers[device.id]['icmp'] = deviceInterval;

    if (device.services) {
        device.services.forEach(service => {
            const interval = setInterval(() => scanService(device.id, service.id), service.interval * 1000);
            trackers[device.id][service.id] = interval;
        });
    }
}

function stopTrackingDevice(deviceId) {
    if (trackers[deviceId]) {
        Object.values(trackers[deviceId]).forEach(clearInterval);
        delete trackers[deviceId];
    }
}

async function scanDeviceICMP(deviceId) {
    const device = monitoredDevices[deviceId];
    if (!device) return;

    try {
        const res = await ping.promise.probe(device.ip, { timeout: 2 });
        const newStatus = res.alive ? 'online' : 'offline';
        const newLatency = (res.time !== 'unknown' && res.time !== undefined) ? parseFloat(res.time) : null;
        
        const statusChanged = device.status !== newStatus;
        device.status = newStatus;
        device.latency = newLatency;
        device.lastUpdate = new Date().toISOString();

        if (statusChanged) {
            io.emit('status-change', device);
            await Device.update({ last_status: newStatus }, { where: { id: deviceId } });
            
            if (newStatus === 'offline') {
                await DowntimeLog.create({ down_at: new Date(), DeviceId: deviceId });
            } else {
                const lastLog = await DowntimeLog.findOne({
                    where: { DeviceId: deviceId, up_at: null },
                    order: [['down_at', 'DESC']]
                });
                if (lastLog) {
                    const upAt = new Date();
                    const duration = Math.floor((upAt - lastLog.down_at) / 1000);
                    await lastLog.update({ up_at: upAt, duration });
                }
            }

            sendEmail(`Device ${device.name} is ${newStatus.toUpperCase()}`, `Device ${device.name} (${device.ip}) is now ${newStatus}.`);
        }
        
        if (newStatus === 'online' && newLatency !== null) {
            await LatencyLog.create({ latency: newLatency, DeviceId: deviceId });
        }

        io.emit('device-update', device);
    } catch (err) {
        console.error(`Error scanning ${device.ip}:`, err);
    }
}

async function scanService(deviceId, serviceId) {
    const device = monitoredDevices[deviceId];
    if (!device) return;
    const service = device.services.find(s => s.id === serviceId);
    if (!service) return;

    const res = await checkService(device.ip, service.port);
    const newStatus = res.alive ? 'online' : 'offline';
    const statusChanged = service.status !== newStatus;

    if (statusChanged) {
        service.status = newStatus;
        await Service.update({ last_status: newStatus }, { where: { id: serviceId } });
        
        if (newStatus === 'offline') {
            await DowntimeLog.create({ down_at: new Date(), ServiceId: serviceId });
            await Service.update({ last_down_at: new Date() }, { where: { id: serviceId } });
            sendEmail(`Service ${service.name} on ${device.name} is DOWN`, `Service ${service.name} (${device.port}) on ${device.name} is now OFFLINE.`);
        } else {
            const lastLog = await DowntimeLog.findOne({
                where: { ServiceId: serviceId, up_at: null },
                order: [['down_at', 'DESC']]
            });
            if (lastLog) {
                const upAt = new Date();
                const duration = Math.floor((upAt - lastLog.down_at) / 1000);
                await lastLog.update({ up_at: upAt, duration });
            }
            sendEmail(`Service ${service.name} on ${device.name} is UP`, `Service ${service.name} (${service.port}) on ${device.name} is back ONLINE.`);
        }
        io.emit('device-update', device);
    }

    if (res.alive) {
        await LatencyLog.create({ latency: res.time, ServiceId: serviceId });
    }
}

async function checkService(ip, port) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const start = Date.now();
        socket.setTimeout(2000);
        
        socket.on('connect', () => {
            socket.destroy();
            resolve({ alive: true, time: Date.now() - start });
        });
        
        socket.on('timeout', () => {
            socket.destroy();
            resolve({ alive: false });
        });
        
        socket.on('error', () => {
            socket.destroy();
            resolve({ alive: false });
        });
        
        socket.connect(port, ip);
    });
}

io.on('connection', (socket) => {
    console.log('Client connected');
    socket.emit('init', Object.values(monitoredDevices));
});

(async () => {
    try {
        await sequelize.sync();
        
        const queryInterface = sequelize.getQueryInterface();
        const tables = ['Devices', 'DowntimeLogs', 'LatencyLogs'];
        for (const tableName of tables) {
            try {
                const tableDef = await queryInterface.describeTable(tableName);
                
                if (tableName === 'Devices' && !tableDef.ping_interval) {
                    await queryInterface.addColumn('Devices', 'ping_interval', {
                        type: DataTypes.INTEGER,
                        defaultValue: 10
                    });
                }
                
                if (tableName === 'DowntimeLogs' && !tableDef.DeviceId) {
                    await queryInterface.addColumn('DowntimeLogs', 'DeviceId', {
                        type: DataTypes.INTEGER,
                        allowNull: true
                    });
                }

                if (tableName === 'LatencyLogs' && !tableDef.DeviceId) {
                    await queryInterface.addColumn('LatencyLogs', 'DeviceId', {
                        type: DataTypes.INTEGER,
                        allowNull: true
                    });
                }
            } catch (tableErr) {
                console.warn(`Table ${tableName} might not exist yet during migration check:`, tableErr.message);
            }
        }

        await loadDevices();
        
        server.listen(PORT, () => {
            console.log(`NodePulse server running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
    }
})();
