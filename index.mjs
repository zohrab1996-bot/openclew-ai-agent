import axios from 'axios';
import Groq from 'groq-sdk';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const CONFIG = {
    API_KEY: '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',
    RECIPIENT: 'zohrab.rza@gmail.com',
    EMAIL_PASS: process.env.EMAIL_PASS,
    IDENTITY: "OpenClew AI Strategic Intelligence v6.0",
    FONT_CACHE: path.resolve('./Roboto.ttf'),
    FONT_URL: 'https://raw.githubusercontent.com/googlefonts/roboto/main/src/v2/Roboto-Regular.ttf',
    PDF_PATH: path.resolve('./Global_Intelligence_Brief.pdf'),
    NEWS_COUNT: 3, // Daha geniş analiz üçün sayı 3-də saxlayırıq
};

const NEWS_SOURCES = [
    'https://openai.com/news/rss.xml',
    'https://deepmind.google/blog/rss.xml',
    'https://www.technologyreview.com/feed/',
    'https://techcrunch.com/category/artificial-intelligence/feed/',
    'https://venturebeat.com/category/ai/feed/',
];

const groq = new Groq({ apiKey: CONFIG.API_KEY });

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function log(icon, msg) { console.log(`${icon} [${new Date().toISOString()}] ${msg}`); }

async function retry(fn, attempts = 3, delay = 2000) {
    for (let i = 0; i < attempts; i++) {
        try { return await fn(); } catch (err) {
            if (i === attempts - 1) throw err;
            log('⏳', `Retry (${i + 1}/${attempts}): ${err.message}`);
            await new Promise(r => setTimeout(r, delay));
        }
    }
}

function parseRSS(xml) {
    const items = [];
    const blocks = [...(xml.matchAll(/<item>([\s\S]*?)<\/item>/g) || []), ...(xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g) || [])];
    for (const block of blocks) {
        const content = block[1];
        const titleMatch = content.match(/<title[^>]*>([\s\S]*?)<\/title>/);
        let title = (titleMatch?.[1] || '').replace(/<!\[CDATA\[([\s\S]*?)]]>/g, '$1').trim();
        const linkMatch = content.match(/<link[^>]+href=["']([^"']+)["']/) || content.match(/<link[^>]*>([\s\S]*?)<\/link>/);
        const link = linkMatch?.[1] || linkMatch?.[2] || '#';
        if (title.length > 5) items.push({ title, link });
    }
    return items.slice(0, CONFIG.NEWS_COUNT);
}

// ─── ANALYZER (English & Deep Focus) ──────────────────────────────────────────
async function analyze(news) {
    const prompt = `You are a high-level Strategic Intelligence Analyst. 
Analyze the following news for an Executive Audience: "${news.title}"

Please provide a detailed report in English with the following sections:
1. EXECUTIVE SUMMARY: What is the core breakthrough? (2-3 sentences)
2. STRATEGIC IMPLICATIONS: How does this shift the global AI landscape, market competition, or ethical standards?
3. BUSINESS & TECH OPPORTUNITY: Identify specific use cases or sectors that will benefit most from this development.
4. RISK ASSESSMENT & MITIGATION: What are the potential pitfalls (security, cost, or reliability) and how to address them?

Tone: Formal, precise, and visionary. Avoid generic statements.`;

    const response = await retry(() =>
        groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.3,
            max_tokens: 1000,
        })
    );
    return response.choices[0].message.content.trim();
}

// ─── PDF ENGINE ───────────────────────────────────────────────────────────────
async function createPDF(data) {
    return new Promise((resolve) => {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const stream = fs.createWriteStream(CONFIG.PDF_PATH);
        doc.pipe(stream);

        // Header Design
        doc.rect(0, 0, 612, 100).fill('#002B5C');
        doc.fillColor('#FFFFFF').fontSize(22).font('Helvetica-Bold').text('GLOBAL STRATEGIC INTELLIGENCE', 50, 35);
        doc.fontSize(10).font('Helvetica').text(`Generated for Zöhrab Rzazadə | ${CONFIG.IDENTITY}`, 50, 65);
        
        doc.moveDown(4);

        data.forEach((item, i) => {
            if (doc.y > 650) doc.addPage();
            
            // News Title
            doc.fillColor('#002B5C').fontSize(16).font('Helvetica-Bold').text(`${i + 1}. ${item.title}`);
            doc.fontSize(8).fillColor('#666666').font('Helvetica').text(`Source: ${item.link}`, { underline: true });
            doc.moveDown(1);

            // Analysis Content
            doc.fillColor('#333333').fontSize(10.5).font('Helvetica').text(item.analysis, {
                align: 'justify',
                lineGap: 3,
                paragraphGap: 10
            });

            doc.moveDown(2);
            doc.moveTo(50, doc.y).lineTo(562, doc.y).strokeColor('#EEEEEE').lineWidth(1).stroke();
            doc.moveDown(2);
        });

        // Footer
        doc.fontSize(8).fillColor('#999999').text(`Confidential | OpenClew AI Strategic Hub | ${new Date().toDateString()}`, 50, 785, { align: 'center' });
        
        doc.end();
        stream.on('finish', () => resolve(CONFIG.PDF_PATH));
    });
}

// ─── MAIN EXECUTION ──────────────────────────────────────────────────────────
async function main() {
    log('🚀', 'Initiating Qlobal Intelligence Mission...');
    let pdfPath = null;
    try {
        const res = await axios.get(NEWS_SOURCES[Math.floor(Math.random() * NEWS_SOURCES.length)]);
        const news = parseRSS(res.data);
        
        const analyzedResults = [];
        for (const n of news) {
            log('🧠', `Analyzing: ${n.title}`);
            const analysis = await analyze(n);
            analyzedResults.push({ ...n, analysis });
        }

        pdfPath = await createPDF(analyzedResults);

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: CONFIG.RECIPIENT, pass: CONFIG.EMAIL_PASS },
        });

        await transporter.sendMail({
            from: `"OpenClew Strategist" <${CONFIG.RECIPIENT}>`,
            to: CONFIG.RECIPIENT,
            subject: `💼 GLOBAL INTELLIGENCE BRIEF — ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
            html: `<h3>Zöhrab Bey,</h3><p>Attached is your deep-dive strategic analysis of today's most critical AI developments.</p><p>Best regards,<br/><strong>${CONFIG.IDENTITY}</strong></p>`,
            attachments: [{ filename: `Global_AI_Report_${Date.now()}.pdf`, path: pdfPath }],
        });

        log('🏁', 'Mission Successful.');
    } catch (err) {
        log('❌', `CRITICAL FAILURE: ${err.message}`);
        process.exit(1);
    }
}

main();
