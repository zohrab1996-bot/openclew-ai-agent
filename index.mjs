import axios from 'axios';
import Groq from 'groq-sdk';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// ─── MASTER CONFIG ────────────────────────────────────────────────────────────
const CONFIG = {
    API_KEY: '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',
    RECIPIENT: 'zohrab.rza@gmail.com',
    EMAIL_PASS: process.env.EMAIL_PASS,
    IDENTITY: "OpenClew Sovereign Intelligence OS v10.0",
    PDF_PATH: path.resolve('./Sovereign_Intelligence_Report.pdf'),
    NEWS_LIMIT: 4
};

const groq = new Groq({ apiKey: CONFIG.API_KEY });

const SOURCES = [
    'https://openai.com/news/rss.xml',
    'https://deepmind.google/blog/rss.xml',
    'https://www.technologyreview.com/feed/',
    'https://techcrunch.com/category/artificial-intelligence/feed/',
    'https://hai.stanford.edu/news/rss.xml'
];

// ─── INTELLIGENCE ENGINE ──────────────────────────────────────────────────────
async function fetchAggregatedIntelligence() {
    console.log("📡 Harvesting global data streams...");
    const shuffled = SOURCES.sort(() => 0.5 - Math.random()).slice(0, 3);
    let rawData = [];

    for (const url of shuffled) {
        try {
            const res = await axios.get(url, { timeout: 12000 });
            const items = res.data.split('<item>').slice(1, 3);
            const parsed = items.map(i => ({
                title: (i.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:]]>)?<\/title>/) || [null, "Intelligence Update"])[1].trim(),
                link: (i.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:]]>)?<\/link>/) || [null, "#"])[1].trim()
            }));
            rawData.push(...parsed);
        } catch (e) { console.warn(`⚠️ Source error: ${url}`); }
    }
    return rawData.slice(0, CONFIG.NEWS_LIMIT);
}

async function synthesizeReport(newsItems) {
    console.log("🧠 Generating Executive Synthesis...");
    const titles = newsItems.map(n => n.title).join(" | ");
    const prompt = `Act as a Sovereign AI Strategist. Summarize these developments: "${titles}". 
    Focus on geopolitical AI competition and digital governance. Provide 3 dense, high-level paragraphs. English.`;

    const res = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3
    });
    return res.choices[0].message.content;
}

async function deepAnalyze(news) {
    console.log(`🔍 Deep Diving: ${news.title.substring(0, 40)}...`);
    const prompt = `As a McKinsey Senior Partner, analyze: "${news.title}".
    Provide a JSON response with:
    - context: Deep technical/strategic background.
    - sectoral_impact: How it affects Government, Energy, and Finance sectors.
    - recommendation: 1-sentence "Killer" advice for an MDDT leader.
    - score: 1-10 for 'Global Impact'.`;

    const res = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        response_format: { type: "json_object" },
        temperature: 0.2
    });
    return JSON.parse(res.choices[0].message.content);
}

// ─── PDF ARCHITECT ────────────────────────────────────────────────────────────
async function buildSovereignPDF(synthesis, data) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const stream = fs.createWriteStream(CONFIG.PDF_PATH);
        doc.pipe(stream);

        // Professional Header
        doc.rect(0, 0, 612, 110).fill('#001F3F');
        doc.fillColor('#FFFFFF').fontSize(26).font('Helvetica-Bold').text('SOVEREIGN AI INTELLIGENCE', 50, 40);
        doc.fontSize(10).font('Helvetica').fillColor('#3A9AD9').text(`EXECUTIVE BRIEFING | ${new Date().toDateString()}`, 50, 70);

        // Section I: Global Synthesis
        doc.moveDown(5).fillColor('#001F3F').fontSize(16).font('Helvetica-Bold').text('I. EXECUTIVE GLOBAL SYNTHESIS');
        doc.moveDown(0.5).fillColor('#333333').fontSize(10.5).font('Helvetica').text(synthesis, { align: 'justify', lineGap: 3 });
        
        doc.moveDown(2).moveTo(50, doc.y).lineTo(562, doc.y).strokeColor('#EEEEEE').stroke();

        // Section II: Deep Dives
        data.forEach((item, i) => {
            doc.addPage();
            // Title Header
            doc.rect(0, 0, 612, 40).fill('#F4F7F9');
            doc.fillColor('#001F3F').fontSize(14).font('Helvetica-Bold').text(`${i + 1}. ${item.title}`, 50, 15);
            doc.fontSize(8).fillColor('#1890FF').text(`SOURCE: ${item.link}`, 50, 45);

            doc.moveDown(3);
            doc.fillColor('#001F3F').fontSize(11).font('Helvetica-Bold').text('STRATEGIC CONTEXT:');
            doc.fillColor('#333333').font('Helvetica').fontSize(10).text(item.analysis.context, { align: 'justify', lineGap: 2 });

            doc.moveDown(1.5).fillColor('#001F3F').font('Helvetica-Bold').text('SECTORAL IMPACT (ENERGY, GOV, FINANCE):');
            doc.fillColor('#333333').font('Helvetica').text(item.analysis.sectoral_impact);

            doc.moveDown(2).rect(50, doc.y, 512, 45).fill('#FFFBE6').strokeColor('#FFE58F').stroke();
            doc.fillColor('#D4380D').font('Helvetica-Bold').text('EXECUTIVE RECOMMENDATION:', 65, doc.y - 35);
            doc.fillColor('#1A1A1A').font('Helvetica').text(item.analysis.recommendation, 65, doc.y - 20);

            doc.fontSize(9).fillColor('#999999').text(`IMPACT SCORE: ${item.analysis.score}/10`, 50, 785);
        });

        doc.end();
        stream.on('finish', () => resolve(CONFIG.PDF_PATH));
        stream.on('error', reject);
    });
}

// ─── EXECUTION ────────────────────────────────────────────────────────────────
async function main() {
    console.log("🚀 Initializing Sovereign Mission...");
    try {
        const news = await fetchAggregatedIntelligence();
        const synthesis = await synthesizeReport(news);
        const compiled = [];

        for (const n of news) {
            const analysis = await deepAnalyze(n);
            compiled.push({ ...n, analysis });
        }

        const report = await buildSovereignPDF(synthesis, compiled);

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: CONFIG.RECIPIENT, pass: CONFIG.EMAIL_PASS }
        });

        await transporter.sendMail({
            from: `"OpenClew Strategist" <${CONFIG.RECIPIENT}>`,
            to: CONFIG.RECIPIENT,
            subject: `💼 SOVEREIGN INTELLIGENCE: ${new Date().toLocaleDateString()}`,
            html: `<h3>Zöhrab Bey,</h3><p>Your <b>v10.0 Sovereign Intelligence Report</b> is attached. This edition eliminates previous parsing errors and provides a fully optimized executive experience.</p>`,
            attachments: [{ filename: 'Sovereign_Intelligence_Report.pdf', path: report }]
        });

        console.log("🏁 Mission Successful. Intelligence Deployed.");
    } catch (err) {
        console.error("❌ CRITICAL FAILURE:", err.message);
        process.exit(1);
    }
}

main();
