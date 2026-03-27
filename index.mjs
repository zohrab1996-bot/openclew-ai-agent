import axios from 'axios';
import Groq from 'groq-sdk';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const CONFIG = {
    GROQ_API_KEY: process.env.GROQ_API_KEY || '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',
    RECIPIENT: 'zohrab.rza@gmail.com',
    EMAIL_PASS: process.env.EMAIL_PASS,
    IDENTITY: "OpenClew Global Intelligence v10.0 (Native)",
    PDF_PATH: path.resolve('./Strategic_Intelligence_Report.pdf'),
    MODEL: 'llama-3.3-70b-versatile',
    MAX_NEWS_PER_SOURCE: 2,
    TOTAL_SOURCES_TO_USE: 3
};

const groq = new Groq({ apiKey: CONFIG.GROQ_API_KEY });

const SOURCES = [
    'https://openai.com/news/rss.xml',
    'https://deepmind.google/blog/rss.xml',
    'https://www.technologyreview.com/feed/',
    'https://techcrunch.com/category/artificial-intelligence/feed/',
    'https://hai.stanford.edu/news/rss.xml'
];

async function getNews( ) {
    console.log("📡 Connecting to global AI streams...");
    const selectedSources = SOURCES.sort(() => 0.5 - Math.random()).slice(0, CONFIG.TOTAL_SOURCES_TO_USE);
    let allItems = [];

    for (const url of selectedSources) {
        try {
            const res = await axios.get(url, { timeout: 15000 });
            const data = res.data;
            const items = data.split('<item>').slice(1, CONFIG.MAX_NEWS_PER_SOURCE + 1);
            
            const parsed = items.map(i => {
                const titleMatch = i.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:]]>)?<\/title>/i);
                const linkMatch = i.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:]]>)?<\/link>/i);
                return {
                    title: titleMatch ? titleMatch[1].trim() : "AI Strategic Update",
                    link: linkMatch ? linkMatch[1].trim() : "#"
                };
            });
            allItems.push(...parsed);
        } catch (e) { console.error(`⚠️ Source failed: ${url}`); }
    }
    if (allItems.length === 0) throw new Error("No news found.");
    return allItems;
}

async function deepAnalyze(news) {
    console.log(`🧠 Analyzing: ${news.title.substring(0, 50)}...`);
    const prompt = `Role: Senior AI Strategy Advisor (OpenClew). Analyze this AI development: "${news.title}". Provide Strategic Context, Industry Impact (Logistics, Energy, Gov in Azerbaijan), Executive Advice, and Risk Analysis. Language: English.`;
    try {
        const res = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: CONFIG.MODEL,
            temperature: 0.3
        });
        return res.choices[0].message.content;
    } catch (e) { return "Analysis currently unavailable."; }
}

async function createFinalPDF(results) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const stream = fs.createWriteStream(CONFIG.PDF_PATH);
        doc.pipe(stream);
        doc.rect(0, 0, 612, 120).fill('#001F3F');
        doc.fillColor('#FFFFFF').fontSize(26).font('Helvetica-Bold').text('STRATEGIC INTELLIGENCE', 50, 45);
        results.forEach((n, i) => {
            if (i > 0) doc.addPage();
            doc.moveDown(5).fillColor('#001F3F').fontSize(18).font('Helvetica-Bold').text(`${i + 1}. ${n.title}`);
            doc.fontSize(9).fillColor('#1890FF').font('Helvetica').text(`SOURCE: ${n.link}`, { underline: true });
            doc.moveDown(1.5).fillColor('#333333').fontSize(11).font('Helvetica').text(n.analysis, { align: 'justify', lineGap: 4 });
        });
        doc.end();
        stream.on('finish', () => resolve(CONFIG.PDF_PATH));
        stream.on('error', reject);
    });
}

async function startCycle() {
    console.log("🚀 STARTING OPEN-CLEW INTELLIGENCE CYCLE...");
    try {
        const news = await getNews();
        const fullData = [];
        for (const n of news) {
            const analysis = await deepAnalyze(n);
            fullData.push({ ...n, analysis });
        }
        const reportPath = await createFinalPDF(fullData);
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: CONFIG.RECIPIENT, pass: CONFIG.EMAIL_PASS }
        });
        await transporter.sendMail({
            from: `"OpenClew Strategist" <${CONFIG.RECIPIENT}>`,
            to: CONFIG.RECIPIENT,
            subject: `💼 STRATEGIC ANALYSIS: ${new Date().toLocaleDateString('en-US')}`,
            html: `<h3>Zöhrab Bey,</h3><p>Your strategic report is ready.</p>`,
            attachments: [{ filename: 'Strategic_Intelligence_Report.pdf', path: reportPath }]
        });
        console.log("🏁 Cycle Complete.");
    } catch (err) {
        console.error(`❌ FAILED: ${err.message}`);
        process.exit(1);
    }
}
startCycle();
