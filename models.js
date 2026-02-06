const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'nodepulse.db'),
    logging: false
});

const User = sequelize.define('User', {
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password_hash: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('Admin', 'Viewer'),
        defaultValue: 'Viewer'
    }
});

const Device = sequelize.define('Device', {
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    ip_address: {
        type: DataTypes.STRING,
        allowNull: false
    },
    type: {
        type: DataTypes.STRING, // Server, Switch, PC
        defaultValue: 'Server'
    },
    ping_interval: {
        type: DataTypes.INTEGER,
        defaultValue: 10 // seconds
    }
});

const Service = sequelize.define('Service', {
    service_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    port_number: {
        type: DataTypes.INTEGER, // 0 for ICMP Ping
        allowNull: false
    },
    check_interval: {
        type: DataTypes.INTEGER,
        defaultValue: 60 // seconds
    },
    last_status: {
        type: DataTypes.STRING,
        defaultValue: 'unknown'
    },
    last_down_at: {
        type: DataTypes.DATE,
        allowNull: true
    }
});

const DowntimeLog = sequelize.define('DowntimeLog', {
    down_at: {
        type: DataTypes.DATE,
        allowNull: false
    },
    up_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    duration: {
        type: DataTypes.INTEGER, // seconds
        allowNull: true
    },
    DeviceId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    ServiceId: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
});

const LatencyLog = sequelize.define('LatencyLog', {
    latency: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    DeviceId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    ServiceId: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
});

const Setting = sequelize.define('Setting', {
    key: {
        type: DataTypes.STRING,
        unique: true
    },
    value: {
        type: DataTypes.TEXT
    }
});

Device.hasMany(Service, { onDelete: 'CASCADE' });
Service.belongsTo(Device);

Device.hasMany(DowntimeLog, { onDelete: 'CASCADE' });
DowntimeLog.belongsTo(Device);

Device.hasMany(LatencyLog, { onDelete: 'CASCADE' });
LatencyLog.belongsTo(Device);

Service.hasMany(DowntimeLog, { onDelete: 'CASCADE' });
DowntimeLog.belongsTo(Service);

Service.hasMany(LatencyLog, { onDelete: 'CASCADE' });
LatencyLog.belongsTo(Service);

module.exports = { sequelize, User, Device, Service, DowntimeLog, LatencyLog, Setting };
