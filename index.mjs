import axios from 'axios';
import Groq from 'groq-sdk';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// --- [ULTRA CONFIG] ---
const CONFIG = {
    API_KEY: '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',
    RECIPIENT: 'zohrab.rza@gmail.com',
    EMAIL_PASS: process.env.EMAIL_PASS,
    IDENTITY: "OpenClew AI Intelligence OS v9.0",
    PDF_PATH: path.resolve('./Strategic_Intelligence_Report.pdf')
};

const groq = new Groq({ apiKey: CONFIG.API_KEY });

const SOURCES = [
    'https://openai.com/news/rss.xml',
    'https://deepmind.google/blog/rss.xml',
    'https://www.technologyreview.com/feed/',
    'https://techcrunch.com/category/artificial-intelligence/feed/',
    'https://hai.stanford.edu/news/rss.xml'
];

// --- [INTELLIGENCE ENGINE] ---

async function getNews() {
    console.log("📡 Aggregating Qlobal Intelligence...");
    const shuffled = SOURCES.sort(() => 0.5 - Math.random()).slice(0, 3);
    let allItems = [];

    for (const url of shuffled) {
        try {
            const res = await axios.get(url, { timeout: 10000 });
            const items = res.data.split('<item>').slice(1, 3);
            const parsed = items.map(i => ({
                title: (i.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:]]>)?<\/title>/) || [null, "AI Update"])[1].trim(),
                link: (i.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:]]>)?<\/link>/) || [null, "#"])[1].trim()
            }));
            allItems.push(...parsed);
        } catch (e) { console.error(`⚠️ Source Bypassed: ${url}`); }
    }
    return allItems;
}

async function synthesizeIntelligence(results) {
    console.log("🧠 Synthesizing Executive Overview...");
    const titles = results.map(r => r.title).join(" | ");
    const prompt = `As a Strategic Intelligence Officer, read these news titles: "${titles}". 
    Provide a 3-paragraph "Global Strategic Synthesis" that connects these developments. 
    Explain what they mean for the future of Sovereign AI and Digital Governance. 
    Tone: High-level, Executive, Precise. English.`;

    const res = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3
    });
    return res.choices[0].message.content;
}

async function deepAnalyze(news) {
    const prompt = `You are a World-Class Strategy Consultant. Analyze: "${news.title}".
    Provide JSON output with these keys:
    1. analysis: Deep strategic context.
    2. sector_impact: Impact on Gov, Energy, and Finance.
    3. recommendation: 1-sentence action.
    4. score: 1-10 for 'Strategic Importance'.`;

    const res = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        response_format: { type: "json_object" },
        temperature: 0.2
    });
    return JSON.parse(res.choices[0].message.content);
}

// --- [PDF ARCHITECT] ---

async function createUltraPDF(summary, results) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const stream = fs.createWriteStream(CONFIG.PDF_PATH);
        doc.pipe(stream);

        // Professional Dark Header
        doc.rect(0, 0, 612, 120).fill('#001529');
        doc.fillColor('#FFFFFF').fontSize(26).font('Helvetica-Bold').text('GLOBAL STRATEGIC BRIEF', 50, 45);
        doc.fontSize(10).font('Helvetica').fillColor('#1890ff').text(`DIGITAL GOVERNANCE HUB | ${new Date().toDateString()}`, 50, 75);

        // Section 1: Executive Synthesis
        doc.moveDown(5).fillColor('#001529').fontSize(16).font('Helvetica-Bold').text('I. EXECUTIVE GLOBAL SYNTHESIS');
        doc.moveDown(0.5).fillColor('#333333').fontSize(10.5).font('Helvetica').text(summary, { align: 'justify', lineGap: 3 });
        
        doc.moveDown(2).moveTo(50, doc.y).lineTo(562, doc.y).strokeColor('#EEEEEE').stroke();

        // Section 2: Deep Dive Analysis
        results.forEach((n, i) => {
            doc.addPage();
            doc.fillColor('#001529').fontSize(18).font('Helvetica-Bold').text(`${i + 1}. ${n.title}`);
            doc.fontSize(8).fillColor('#1890ff').text(`REF: ${n.link}`, { underline: true });
            
            doc.moveDown(1.5).fillColor('#001529').fontSize(11).font('Helvetica-Bold').text('STRATEGIC CONTEXT:');
            doc.fillColor('#333333').font('Helvetica').text(n.analysis.analysis, { align: 'justify' });

            doc.moveDown(1).fillColor('#001529').font('Helvetica-Bold').text('SECTORAL IMPACT:');
            doc.fillColor('#333333').font('Helvetica').text(n.analysis.sector_impact);

            doc.moveDown(1.5).rect(50, doc.y, 512, 35).fill('#F5F5F5');
            doc.fillColor('#D4380D').font('Helvetica-Bold').text('RECOMMENDATION:', 60, doc.y - 25);
            doc.fillColor('#1A1A1A').font('Helvetica').text(n.analysis.recommendation, 60, doc.y - 12);

            // Importance Badge
            doc.fontSize(8).fillColor('#999999').text(`Strategic Importance: ${n.analysis.score}/10`, 50, 785);
        });

        doc.end();
        stream.on('finish', () => resolve(CONFIG.PDF_PATH));
        stream.on('error', reject);
    });
}

// --- [RUN CYCLE] ---

async function runMission() {
    try {
        const newsList = await getNews();
        const synthesis = await synthesizeIntelligence(newsList);
        
        const analyzedResults = [];
        for (const n of newsList) {
            const analysis = await deepAnalyze(n);
            analyzedResults.push({ ...n, analysis });
        }

        const reportPath = await createUltraPDF(synthesis, analyzedResults);

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: CONFIG.RECIPIENT, pass: CONFIG.EMAIL_PASS }
        });

        await transporter.sendMail({
            from: `"OpenClew Strategist" <${CONFIG.RECIPIENT}>`,
            to: CONFIG.RECIPIENT,
            subject: `🚀 STRATEGIC INTELLIGENCE — ${new Date().toLocaleDateString()}`,
            html: `<h3>Zöhrab Bey,</h3><p>Your executive briefing is ready. This edition includes a <b>Global Synthesis</b> and <b>${analyzedResults.length} detailed deep-dives</b>.</p>`,
            attachments: [{ filename: 'Strategic_Brief_v9.pdf', path: reportPath }]
        });

        console.log("🏁 Mission Successful.");
    } catch (err) {
        console.error("❌ Critical Failure:", err.message);
        process.exit(1);
    }
}

runMission();
