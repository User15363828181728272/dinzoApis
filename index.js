const express = require("express");
const chalk = require("chalk");
const fs = require("fs");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4000;

const TELE_TOKEN = process.env.TELEGRAM_TOKEN || "8513744057:AAFmmLVaWQJ8G-KkN1bjNaNlz2VtYTaFSxY";
const CHAT_ID = process.env.CHAT_ID || "-1003889656967";
const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));

async function sendTelegram(text) {
    if (!TELE_TOKEN || !CHAT_ID) return;
    try {
        await fetch(`https://api.telegram.org/bot${TELE_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: text,
                parse_mode: "Markdown"
            })
        });
    } catch (err) {
        console.error(chalk.red(`[TelegramError] ${err.message}`));
    }
}

async function sendNotification(msg) {
    sendTelegram(`🔔 *Notification*\n${msg}`);
}

async function sendLog({ ip, method, endpoint, status, query, duration }) {
    const icons = { request: "🟡", success: "✅", error: "❌" };
    const message = [
        `${icons[status]} *API Activity - ${status.toUpperCase()}*`,
        `━━━━━━━━━━━━━━`,
        `🌐 *IP:* \`${ip}\``,
        `📡 *Method:* ${method}`,
        `📍 *Endpoint:* \`${endpoint}\``,
        `⏱️ *Duration:* ${duration ?? "-"}ms`,
        `🔍 *Query:*`,
        `\`\`\`json\n${JSON.stringify(query || {}, null, 2)}\n\`\`\``,
        `━━━━━━━━━━━━━━`,
        `✨ _Dinzo API's Log System_`
    ].join("\n");
    sendTelegram(message);
}

app.enable("trust proxy");
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.set("json spaces", 2);

app.use("/", express.static(path.join(__dirname, "api-page")));
app.use("/src", express.static(path.join(__dirname, "src")));

const openApiPath = path.join(__dirname, "./src/openapi.json");
let openApi = {};

try {
    openApi = JSON.parse(fs.readFileSync(openApiPath));
} catch {
    console.warn(chalk.yellow("⚠️ openapi.json not found or invalid."));
}

app.get("/openapi.json", (req, res) => {
    if (fs.existsSync(openApiPath)) res.sendFile(openApiPath);
    else res.status(404).json({ status: false, message: "openapi.json tidak ditemukan" });
});

function matchOpenApiPath(requestPath) {
    const paths = Object.keys(openApi.paths || {});
    for (const apiPath of paths) {
        const regex = new RegExp("^" + apiPath.replace(/{[^}]+}/g, "[^/]+") + "$");
        if (regex.test(requestPath)) return true;
    }
    return false;
}

app.use((req, res, next) => {
    const original = res.json;
    res.json = function (data) {
        if (typeof data === "object") {
            data = {
                status: data.status ?? true,
                creator: openApi.info?.author || "Rynn UI",
                ...data
            };
        }
        return original.call(this, data);
    };
    next();
});

const endpointStats = {};

app.use(async (req, res, next) => {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const method = req.method;
    const endpoint = req.originalUrl.split("?")[0];
    const query = req.query;
    const start = Date.now();

    try {
        if (matchOpenApiPath(endpoint)) {
            sendLog({ ip, method, endpoint, status: "request", query });
            console.log(chalk.yellow(`🟡 [REQUEST] ${method} ${endpoint} | IP: ${ip}`));
        }

        next();

        res.on("finish", () => {
            if (!matchOpenApiPath(endpoint)) return;

            const duration = Date.now() - start;
            const isError = res.statusCode >= 400;
            const status = isError ? "error" : "success";

            if (!endpointStats[endpoint]) endpointStats[endpoint] = { total: 0, errors: 0, totalDuration: 0 };
            endpointStats[endpoint].total++;
            endpointStats[endpoint].totalDuration += duration;
            if (isError) endpointStats[endpoint].errors++;

            const avg = (endpointStats[endpoint].totalDuration / endpointStats[endpoint].total).toFixed(2);

            sendLog({ ip, method, endpoint, status, query, duration });

            console.log(
                chalk[isError ? "red" : "green"](
                    `${isError ? "❌" : "✅"} [${status.toUpperCase()}] ${method} ${endpoint} | ${res.statusCode} | ${duration}ms (Avg: ${avg}ms)`
                )
            );
        });
    } catch (err) {
        console.error(chalk.red(`❌ Middleware Error: ${err.message}`));
        res.status(500).json({ status: false, message: "Internal middleware error" });
    }
});

let totalRoutes = 0;
const apiFolder = path.join(__dirname, "./src/api");

if (fs.existsSync(apiFolder)) {
    fs.readdirSync(apiFolder).forEach((sub) => {
        const subPath = path.join(apiFolder, sub);
        if (fs.statSync(subPath).isDirectory()) {
            fs.readdirSync(subPath).forEach((file) => {
                if (file.endsWith(".js")) {
                    const route = require(path.join(subPath, file));
                    if (typeof route === "function") route(app);

                    totalRoutes++;
                    console.log(chalk.bgYellow.black(`Loaded Route: ${file}`));
                    sendNotification(`✅ Loaded Route: ${file}`);
                }
            });
        }
    });
}

sendNotification(`🟢 Server started. Total Routes Loaded: ${totalRoutes}`);

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "api-page", "index.html")));
app.get("/docs", (req, res) => res.sendFile(path.join(__dirname, "api-page", "docs.html")));

app.use((req, res) => res.status(404).sendFile(path.join(__dirname, "api-page", "404.html")));

app.use((err, req, res, next) => {
    console.error(err.stack);
    sendNotification(`🚨 Server Error: ${err.message}`);
    res.status(500).sendFile(path.join(__dirname, "api-page", "500.html"));
});

app.listen(PORT, () => {
    console.log(chalk.bgGreen.black(`Server running on port ${PORT}`));
});
