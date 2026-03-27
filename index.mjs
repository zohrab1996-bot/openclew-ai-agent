import axios from 'axios';
import Groq from 'groq-sdk';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// --- [ARCHITECTURE CONFIG] ---
const CONFIG = {
    API_KEY: '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',
    RECIPIENT: 'zohrab.rza@gmail.com',
    EMAIL_PASS: process.env.EMAIL_PASS,
    IDENTITY: "OpenClew Global Intelligence v8.2",
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

// --- [CORE ENGINE] ---

async function getNews() {
    console.log("📡 Connecting to global AI streams...");
    // 2 fərqli mənbədən xəbər çəkirik ki, hesabat geniş olsun
    const selectedSources = SOURCES.sort(() => 0.5 - Math.random()).slice(0, 2);
    let allItems = [];

    for (const url of selectedSources) {
        try {
            const res = await axios.get(url, { timeout: 10000 });
            const items = res.data.split('<item>').slice(1, 3); // Hər mənbədən 2 xəbər
            const parsed = items.map(i => ({
                title: (i.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:]]>)?<\/title>/) || [null, "AI Innovation"])[1].trim(),
                link: (i.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:]]>)?<\/link>/) || [null, "#"])[1].trim()
            }));
            allItems.push(...parsed);
        } catch (e) { console.error(`⚠️ Source failed: ${url}`); }
    }
    
    if (allItems.length === 0) throw new Error("No news found in all sources.");
    return allItems;
}

async function deepAnalyze(news) {
    console.log(`🧠 Synthesizing Strategy: ${news.title.substring(0, 40)}...`);
    const prompt = `You are a Global AI Strategy Advisor. Analyze this: "${news.title}".
    Provide a multi-layered report:
    1. GLOBAL CONTEXT: The broader meaning of this tech.
    2. INDUSTRY VERTICALS: Impact on Logistics, Energy, and Government services.
    3. STRATEGIC IMPERATIVE: Concrete 1-sentence advice for an executive leader.
    4. RISK & VIABILITY: Potential challenges.
    Language: English. Professional and Deep.`;

    const res = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2
    });
    return res.choices[0].message.content;
}

async function createFinalPDF(results) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const stream = fs.createWriteStream(CONFIG.PDF_PATH);
        
        doc.pipe(stream);

        // Header - Enterprise Blue
        doc.rect(0, 0, 612, 110).fill('#001F3F');
        doc.fillColor('#FFFFFF').fontSize(24).font('Helvetica-Bold').text('GLOBAL STRATEGIC BRIEF', 50, 40);
        doc.fontSize(10).font('Helvetica').fillColor('#3A9AD9').text(`OpenClew AI Intelligence OS | v8.2 | ${new Date().toDateString()}`, 50, 70);

        results.forEach((n, i) => {
            if (i > 0) doc.addPage();
            
            doc.moveDown(5).fillColor('#001F3F').fontSize(18).font('Helvetica-Bold').text(`${i + 1}. ${n.title}`);
            doc.fontSize(9).fillColor('#1890FF').font('Helvetica').text(`REFERENCE: ${n.link}`, { underline: true });
            
            doc.moveDown(1.5).fillColor('#333333').fontSize(11).font('Helvetica').text(n.analysis, {
                align: 'justify',
                lineGap: 4
            });

            // Page Footer
            doc.fontSize(8).fillColor('#AAAAAA').text(`Internal Strategy Document | Page ${i + 1}`, 50, 785, { align: 'center' });
        });

        doc.end();

        stream.on('finish', () => {
            const size = fs.statSync(CONFIG.PDF_PATH).size;
            console.log(`✅ PDF Finished. Size: ${size} bytes`);
            resolve(CONFIG.PDF_PATH);
        });
        stream.on('error', reject);
    });
}

async function startCycle() {
    console.log("🚀 Starting Intelligence Cycle...");
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
            html: `<h3>Zöhrab Bey,</h3><p>Your AI-driven strategic intelligence report is attached. This edition contains <b>${fullData.length} deep-dive analyses</b>.</p>`,
            attachments: [{ filename: 'Strategic_Intelligence_Report.pdf', path: reportPath }]
        });

        console.log("🏁 Cycle Complete. Email sent.");
    } catch (err) {
        console.error(`❌ MISSION FAILED: ${err.message}`);
        process.exit(1);
    }
}

startCycle();
