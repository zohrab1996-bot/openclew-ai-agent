import axios from 'axios';
import { GoogleGenerativeAI } from "@google/generative-ai";
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const CONFIG = {
    API_KEY: process.env.GEMINI_API_KEY || 'AIzaSyAkN29GiV31NDJxNtSLOj4c5dZXDojosFA', 
    RECIPIENT: 'zohrab.rza@gmail.com',
    EMAIL_PASS: process.env.EMAIL_PASS,
    IDENTITY: "OpenClew Global Intelligence v10.0",
    PDF_PATH: path.resolve('./Full_Strategic_Intelligence_Report.pdf')
};

const genAI = new GoogleGenerativeAI(CONFIG.API_KEY);

// DÜZƏLİŞ: Model adını tam prefiks ilə yazırıq (Bu 404 xətasını 99% həll edir)
const model = genAI.getGenerativeModel({ 
    model: "models/gemini-1.5-flash" 
});

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
        const res = await axios.get(url, { timeout: 10000 });
        const items = res.data.split('<item>').slice(1, 2);
        if (items.length === 0) return null;
        const i = items[0];
        const titleMatch = i.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:]]>)?<\/title>/);
        const linkMatch = i.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:]]>)?<\/link>/);
        return {
            title: titleMatch ? titleMatch[1].trim() : "AI Strategic Update",
            link: linkMatch ? linkMatch[1].trim() : "#",
            source: new URL(url).hostname
        };
    } catch (e) { return null; }
}

async function deepAnalyze(news) {
    console.log(`🧠 Analiz: ${news.title.substring(0, 30)}...`);
    
    // Rate limit qoruması
    await sleep(5500);

    try {
        // Ən sadə çağırış forması
        const result = await model.generateContent(`Analyze: ${news.title}. Provide 3 bullet points in English.`);
        const response = await result.response;
        return response.text();
    } catch (err) {
        // Əgər yenə xəta verərsə, log-da səbəbi görək
        console.error(`❌ Xəta (${news.source}):`, err.message);
        return "Technical skip: " + err.message.substring(0, 50);
    }
}

async function createMassivePDF(results) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const stream = fs.createWriteStream(CONFIG.PDF_PATH);
        doc.pipe(stream);
        doc.rect(0, 0, 612, 120).fill('#001F3F');
        doc.fillColor('#FFFFFF').fontSize(26).font('Helvetica-Bold').text('GLOBAL INTELLIGENCE HUB', 40, 45);
        doc.fontSize(10).font('Helvetica').fillColor('#3A9AD9').text(`GEMINI NODE | ${new Date().toDateString()}`, 40, 75);

        results.forEach((n, i) => {
            if (i % 2 === 0 && i !== 0) doc.addPage();
            doc.moveDown(4);
            doc.fillColor('#001F3F').fontSize(14).font('Helvetica-Bold').text(`${i + 1}. [${n.source.toUpperCase()}]`);
            doc.fontSize(10).fillColor('#333333').text(n.title);
            doc.moveDown(0.5).fontSize(10).fillColor('#444444').font('Helvetica').text(n.analysis);
            doc.moveDown(1).moveTo(40, doc.y).lineTo(572, doc.y).strokeColor('#EEEEEE').stroke();
        });

        doc.end();
        stream.on('finish', () => resolve(CONFIG.PDF_PATH));
        stream.on('error', reject);
    });
}

async function startMasterCycle() {
    console.log("🚀 Sync starting...");
    try {
        const fetchPromises = SOURCES.map(url => fetchFromSource(url));
        const rawResults = await Promise.all(fetchPromises);
        const validNews = rawResults.filter(n => n !== null);
        
        const fullData = [];
        for (const n of validNews) {
            const analysis = await deepAnalyze(n);
            fullData.push({ ...n, analysis });
        }

        const reportPath = await createMassivePDF(fullData);
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: CONFIG.RECIPIENT, pass: CONFIG.EMAIL_PASS }
        });

        await transporter.sendMail({
            from: `"OpenClew Hub" <${CONFIG.RECIPIENT}>`,
            to: CONFIG.RECIPIENT,
            subject: `🌍 GEMINI REPORT — ${new Date().toLocaleDateString()}`,
            text: "Report attached.",
            attachments: [{ filename: 'Report.pdf', path: reportPath }]
        });
        console.log("🏁 Done.");
    } catch (err) {
        console.error("❌ Master fail:", err.message);
        process.exit(1);
    }
}

startMasterCycle();
