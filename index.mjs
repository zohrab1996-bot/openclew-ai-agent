import axios from 'axios';
import { GoogleGenerativeAI } from "@google/generative-ai";
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// --- [CONFIG] ---
const CONFIG = {
    API_KEY: process.env.GEMINI_API_KEY || 'AIzaSyD_9bm5LyXN2jx0qIF8q1VO95B2QAuEFLo',
    RECIPIENT: 'zohrab.rza@gmail.com',
    EMAIL_PASS: process.env.EMAIL_PASS,
    IDENTITY: "OpenClew Global Intelligence v10.0",
    PDF_PATH: path.resolve('./Full_Strategic_Intelligence_Report.pdf')
};

const genAI = new GoogleGenerativeAI(CONFIG.API_KEY);

const POSSIBLE_MODELS = [
    "gemini-2.0-flash",
    "gemini-2.5-pro-exp-03-25"
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const SOURCES = [
    'https://openai.com/news/rss.xml',
    'https://deepmind.google/blog/rss.xml',
    'https://www.technologyreview.com/feed/',
    'https://techcrunch.com/category/artificial-intelligence/feed/',
    'https://hai.stanford.edu/news/rss.xml',
    'https://blogs.nvidia.com/feed/',
    'https://www.microsoft.com/en-us/research/feed/',
    'https://ai.meta.com/blog/rss/',
    'https://bair.berkeley.edu/blog/feed.xml',
    'https://spectrum.ieee.org/rss/topic/artificial-intelligence/fulltext',
    'https://www.wired.com/feed/tag/ai/latest/rss',
    'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml',
    'https://venturebeat.com/category/ai/feed/',
    'https://feeds.arstechnica.com/arstechnica/index',
    'https://www.kdnuggets.com/feed',
    'https://towardsdatascience.com/feed',
    'https://machinelearningmastery.com/feed/',
    'https://www.datasciencecentral.com/feed/',
    'https://feed.infoq.com/ai-ml-data-eng/rss',
    'https://www.zdnet.com/topic/artificial-intelligence/rss.xml',
    'https://www.marktechpost.com/feed/',
    'https://www.unite.ai/feed/',
    'https://www.analyticsvidhya.com/blog/feed/',
    'https://aws.amazon.com/blogs/machine-learning/feed/',
    'https://huggingface.co/blog/feed.xml',
    'https://blog.google/technology/ai/rss/',
    'https://machinelearning.apple.com/rss.xml',
    'https://thegradient.pub/rss/',
    'https://www.skynettoday.com/rss.xml',
    'https://inside.com/ai/rss'
];

async function fetchFromSource(url) {
    try {
        const res = await axios.get(url, { timeout: 15000 });
        const items = res.data.split('<item>').slice(1, 2);
        if (items.length === 0) return null;
        const i = items[0];

        const titleMatch = i.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
        const linkMatch  = i.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/) ||
                           i.match(/<link\s+href="([^"]+)"/);

        const title = titleMatch ? titleMatch[1].trim() : "AI Strategic Update";
        let link = "#";
        if (linkMatch) {
            link = linkMatch[1].trim();
            if (!link || link.length < 5) {
                const altMatch = i.match(/<guid[^>]*>(?:<!\[CDATA\[)?(https?:\/\/[^\s<]+)/);
                if (altMatch) link = altMatch[1].trim();
            }
        }

        return { title, link, source: new URL(url).hostname };
    } catch (e) {
        console.warn(`⚠️ Mənbə əlçatmaz: ${url} — ${e.message}`);
        return null;
    }
}

async function deepAnalyze(news) {
    console.log(`🧠 Analiz: ${news.source} | ${news.title.substring(0, 50)}...`);
    await sleep(5000);

    for (const modelName of POSSIBLE_MODELS) {
        try {
            const model = genAI.getGenerativeModel({
                model: modelName,
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT",       threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH",       threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ]
            });

            const result = await model.generateContent(
                `Analyze this AI news title: "${news.title}". Provide 3 short executive bullet points in English.`
            );
            const text = result.response.text();
            if (text) {
                console.log(`✅ ${modelName} ilə analiz uğurlu.`);
                return text;
            }
        } catch (err) {
            console.error(`❌ ${modelName} xəta: ${err.message}`);
            if (err.message.includes("404") || err.message.includes("not found")) {
                continue;
            }
        }
    }
    return "Analysis unavailable.";
}

async function createMassivePDF(results) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const stream = fs.createWriteStream(CONFIG.PDF_PATH);
        doc.pipe(stream);

        doc.rect(0, 0, 612, 120).fill('#001F3F');
        doc.fillColor('#FFFFFF').fontSize(26).font('Helvetica-Bold').text('GLOBAL INTELLIGENCE HUB', 40, 45);
        doc.fontSize(10).font('Helvetica').fillColor('#3A9AD9')
           .text(`MULTI-NODE SYNC | ${new Date().toDateString()}`, 40, 75);

        results.forEach((n, i) => {
            if (i % 2 === 0 && i !== 0) doc.addPage();
            doc.moveDown(i % 2 === 0 ? 5 : 2);

            doc.fillColor('#001F3F').fontSize(14).font('Helvetica-Bold')
               .text(`${i + 1}. [${n.source.toUpperCase()}]`);

            doc.fontSize(10).fillColor('#333333').font('Helvetica-Bold')
               .text(n.title);

            if (n.link && n.link !== '#') {
                doc.fontSize(9).fillColor('#1a73e8').font('Helvetica')
                   .text(n.link, { link: n.link, underline: true });
            }

            doc.moveDown(0.5).fontSize(10).fillColor('#444444').font('Helvetica')
               .text(n.analysis, { align: 'justify' });

            doc.moveDown(1)
               .moveTo(40, doc.y).lineTo(572, doc.y)
               .strokeColor('#EEEEEE').stroke();
        });

        doc.end();
        stream.on('finish', () => resolve(CONFIG.PDF_PATH));
        stream.on('error', reject);
    });
}

async function startMasterCycle() {
    console.log("🚀 OpenClew Global Sync Initializing...");
    try {
        const rawResults = await Promise.all(SOURCES.map(fetchFromSource));
        const validNews = rawResults.filter(n => n !== null);
        console.log(`✅ ${validNews.length} mənbədən xəbər alındı.`);

        const fullData = [];
        for (const n of validNews) {
            const analysis = await deepAnalyze(n);
            fullData.push({ ...n, analysis });
        }

        const reportPath = await createMassivePDF(fullData);
        console.log(`📄 PDF hazırlandı: ${reportPath}`);

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: CONFIG.RECIPIENT,
                pass: CONFIG.EMAIL_PASS
            }
        });

        await transporter.sendMail({
            from: `"OpenClew Hub" <${CONFIG.RECIPIENT}>`,
            to: CONFIG.RECIPIENT,
            subject: `🌍 GLOBAL AI REPORT — ${new Date().toLocaleDateString()}`,
            html: `<h3>Zöhrab Bey,</h3>
                   <p>Bugünkü AI hesabatı hazırdır.</p>
                   <p><b>Mənbə sayı:</b> ${fullData.length}</p>
                   <p><b>Tarix:</b> ${new Date().toDateString()}</p>`,
            attachments: [{
                filename: 'Global_Intelligence_Report.pdf',
                path: reportPath
            }]
        });

        console.log("🏁 Proses uğurla başa çatdı. Email göndərildi.");
    } catch (err) {
        console.error("❌ Kritik xəta:", err.message);
        process.exit(1);
    }
}

startMasterCycle();
