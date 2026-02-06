# 🚀 NodePulse

<div align="center">
  <img width="45%" alt="Dashboard" src="https://github.com/user-attachments/assets/f3049f3e-a0ef-45e1-b3dc-80c21dad8519" />
  <img width="35%" alt="Details-Widget" src="https://github.com/user-attachments/assets/a301cad6-6bfb-4e31-a75c-5ec44429f36a" />
  
  <br />

[![GitHub license](https://img.shields.io/github/license/ademmoe/NodePulse?style=flat-square)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen?style=flat-square)](https://nodejs.org/)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg?style=flat-square)](https://github.com/ademmoe/NodePulse/graphs/commit-activity)

**A high-performance, lightweight monitoring engine for real-time infrastructure visibility.**
</div>

---

## 📖 Overview

**NodePulse** is a self-hosted network monitoring suite designed for speed and simplicity. Built on Node.js, it transforms complex infrastructure data into an intuitive, real-time dashboard. Whether you're managing a home lab or a professional server room, NodePulse provides the pulse of your network at a glance.

---

## ✨ Key Features

* 📡 **Proactive Monitoring:** Real-time ICMP ping and TCP port tracking (HTTP, SSH, DB) for instant status updates.
* 📺 **NOC Kiosk Mode:** A dedicated, auto-scaling view optimized for wall-mounted displays in Network Operations Centers.
* 📧 **Instant Alerting:** Integrated SMTP notifications to ensure zero-delay response when critical systems fail.
* 📊 **Deep Insights:** Interactive Chart.js visualizations for latency trends and historical downtime analysis.
* 🛡️ **Enterprise Security:** Secure authentication with Role-Based Access Control (Admin vs. Viewer).
* 📱 **Responsive UI:** Built with Tailwind CSS for seamless monitoring on desktop, tablet, or mobile.
* ⚙️ **Zero-Config Setup:** Automated SQLite initialization and a streamlined first-run setup wizard.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Backend** | Node.js, Express.js |
| **Real-time** | Socket.IO (WebSockets) |
| **Database** | SQLite via Sequelize ORM |
| **Frontend** | Vanilla JS, Tailwind CSS, Chart.js |
| **Core Logic** | Native `net` & `ping` modules |
| **Auth** | Bcrypt & Express-Session |

---

## 🚀 Getting Started

### 1. Prerequisites
* **Node.js** (v18+ recommended)
* **Git**

### 2. Installation
1.  **Clone the repository**
    ```bash
    git clone https://github.com/ademmoe/NodePulse.git
    cd NodePulse
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Database setup**
    The application uses SQLite, which is file-based. The database file (`nodepulse.db`) will be automatically created in the root directory on the first run.

4.  **Start server**
    ```bash
    node index.js
    ```

5.  **Open your browser**
    -   **Dashboard:** Visit `http://localhost:[YOUR_PORT]/` (e.g., `http://localhost:3000/dashboard`)
  
6.  **Run the setup**
    Visit the Admin Dashboard. There, you will find the initial setup screen. Create the initial admin user. After that, the configuration is completed and you can use NodePulse.


## 🧪 Testing

This project does not include a dedicated testing suite or framework. Testing is primarily manual by interacting with the application via browser.

## 🚀 Deployment

To deploy `NodePulse` to a production environment:

1.  **Build (if any):** This project does not require a specific build step; it runs directly with Node.js.
2.  **Run:** Use a process manager like PM2 or Systemd to keep the `npm start` process running in the background and to handle restarts.
    ```bash
    # Example using PM2 (install globally: npm install -g pm2)
    pm2 start index.js --name nodepulse
    pm2 save
    ```


## 📁 Infrastructure Overview

NodePulse follows a clean, modular structure for easy customization:

```text
NodePulse/
├── public/             # Optimized frontend assets
│   ├── index.html      # Main Monitoring Hub
│   ├── kiosk.html      # NOC Wall-Display Mode
│   └── setup.html      # First-Run Provisioning
├── models.js           # Relational Database Schema
├── index.js            # Monitoring Engine & WebSocket Logic
└── nodepulse.db        # Portable SQLite Database
```

## 🤝 Contributing

We welcome contributions to `NodePulse`! If you'd like to contribute, please follow these steps:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Commit your changes (`git commit -m 'feat: Add new feature'`).
5.  Push to the branch (`git push origin feature/your-feature-name`).
6.  Open a Pull Request.


## 📄 License

This project is licensed under the [MIT License](LICENSE) - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

-   **Node.js**: For providing a powerful JavaScript runtime.
-   **Express.js**: For making web application development in Node.js simple and robust.
-   **EJS**: For elegant templating.
-   **Multer**: For simplifying file uploads.
-   **SQLite**: For a lightweight and serverless database solution.
-   **`bcrypt`**: For secure password hashing.
-   **`dotenv`**: For managing environment variables.
-   **`express-session`**: For session management.

## 📞 Support & Contact

-   🐛 Issues: Feel free to report bugs or suggest features on [GitHub Issues](https://github.com/ademmoe/NodePulse/issues).
---

<div align="center">

**⭐ Star this repo if you find it helpful!**

Made with ❤️ by [Adem Karagöz](https://github.com/ademmoe)

</div>
