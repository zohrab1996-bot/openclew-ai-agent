import axios from 'axios';
import Groq from 'groq-sdk';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// --- [ULTRA-SCALE CONFIG] ---
const CONFIG = {
    API_KEY: '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',
    RECIPIENT: 'zohrab.rza@gmail.com',
    EMAIL_PASS: process.env.EMAIL_PASS,
    IDENTITY: "OpenClew Global Intelligence v10.0 (Full Node Sync)",
    PDF_PATH: path.resolve('./Full_Strategic_Intelligence_Report.pdf')
};

const groq = new Groq({ apiKey: CONFIG.API_KEY });

// --- [ALL 30 GLOBAL SOURCES] ---
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

// --- [CORE ENGINE] ---

async function fetchFromSource(url) {
    try {
        const res = await axios.get(url, { timeout: 8000 });
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
    } catch (e) {
        return null;
    }
}

async function deepAnalyze(news) {
    console.log(`🧠 High-Velocity Analysis: ${news.title.substring(0, 35)}...`);
    const prompt = `As an Executive AI Advisor, analyze this news from ${news.source}: "${news.title}".
    Provide exactly 3 bullet points:
    1. GLOBAL IMPACT: Market significance.
    2. SECTORAL VALUE: Benefit to Gov/Enterprise.
    3. STRATEGIC RISK: One critical concern.
    Language: English. Professional.`;

    try {
        const res = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.1
        });
        return res.choices[0].message.content;
    } catch (err) {
        return "Analysis skipped due to high-volume throughput limits.";
    }
}

async function createMassivePDF(results) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const stream = fs.createWriteStream(CONFIG.PDF_PATH);
        doc.pipe(stream);

        // Professional Navy Header
        doc.rect(0, 0, 612, 120).fill('#001F3F');
        doc.fillColor('#FFFFFF').fontSize(26).font('Helvetica-Bold').text('GLOBAL INTELLIGENCE HUB', 40, 45);
        doc.fontSize(10).font('Helvetica').fillColor('#3A9AD9').text(`30-NODE FULL SYNC REPORT | v10.0 | ${new Date().toDateString()}`, 40, 75);

        results.forEach((n, i) => {
            // Hər səhifədə 2 xəbər yerləşdiririk ki, PDF çox uzun olmasın (cəmi ~15 səhifə)
            if (i % 2 === 0 && i !== 0) doc.addPage();
            
            doc.moveDown(i % 2 === 0 ? 5 : 2);
            doc.fillColor('#001F3F').fontSize(14).font('Helvetica-Bold').text(`${i + 1}. [${n.source.toUpperCase()}] ${n.title}`);
            doc.fontSize(8).fillColor('#1890FF').font('Helvetica').text(`LINK: ${n.link}`, { underline: true });
            
            doc.moveDown(0.7).fillColor('#333333').fontSize(10).font('Helvetica').text(n.analysis, {
                align: 'justify',
                lineGap: 3
            });

            doc.moveDown(1.5).moveTo(40, doc.y).lineTo(572, doc.y).strokeColor('#EEEEEE').stroke();
        });

        doc.end();
        stream.on('finish', () => resolve(CONFIG.PDF_PATH));
        stream.on('error', reject);
    });
}

async function startMasterCycle() {
    console.log("🚀 Initializing 30-Node Global Intelligence Sync...");
    try {
        // Step 1: Parallel Fetching (Bütün mənbələrə eyni anda sorğu göndəririk)
        const fetchPromises = SOURCES.map(url => fetchFromSource(url));
        const rawResults = await Promise.all(fetchPromises);
        const validNews = rawResults.filter(n => n !== null);

        console.log(`✅ Success: ${validNews.length}/${SOURCES.length} nodes responded.`);

        // Step 2: Sequential Analysis (Rate-limit qoruması üçün analizlər növbəli gedir)
        const fullData = [];
        for (const n of validNews) {
            const analysis = await deepAnalyze(n);
            fullData.push({ ...n, analysis });
        }

        // Step 3: PDF & Email
        const reportPath = await createMassivePDF(fullData);

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: CONFIG.RECIPIENT, pass: CONFIG.EMAIL_PASS }
        });

        await transporter.sendMail({
            from: `"OpenClew Global Hub" <${CONFIG.RECIPIENT}>`,
            to: CONFIG.RECIPIENT,
            subject: `🌍 FULL GLOBAL SYNC REPORT — ${new Date().toLocaleDateString()}`,
            html: `<h3>Zöhrab Bey,</h3><p>The system has successfully synchronized with <b>${validNews.length} active intelligence nodes</b> across the globe.</p><p>This comprehensive report contains the latest strategic updates from 30+ industry leaders.</p>`,
            attachments: [{ filename: 'Global_Intelligence_Full_Sync.pdf', path: reportPath }]
        });

        console.log("🏁 Global Mission Accomplished.");
    } catch (err) {
        console.error(`❌ MASTER FAILURE: ${err.message}`);
        process.exit(1);
    }
}

startMasterCycle();
