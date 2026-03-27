import axios from 'axios';
import Groq from 'groq-sdk';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// ─── SENIOR CONFIG ────────────────────────────────────────────────────────────
const CONFIG = {
    API_KEY: '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',
    RECIPIENT: 'zohrab.rza@gmail.com',
    EMAIL_PASS: process.env.EMAIL_PASS,
    IDENTITY: "OpenClew Enterprise Intelligence v8.0",
    PDF_PATH: path.resolve('./Strategic_Intelligence_Full_Brief.pdf'),
    NEWS_LIMIT: 5 // Daha çox xəbər, daha geniş hesabat
};

const groq = new Groq({ apiKey: CONFIG.API_KEY });

// ─── COMPREHENSIVE SOURCES ────────────────────────────────────────────────────
const SOURCES = [
    { name: 'OpenAI', url: 'https://openai.com/news/rss.xml' },
    { name: 'DeepMind', url: 'https://deepmind.google/blog/rss.xml' },
    { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/' },
    { name: 'Stanford HAI', url: 'https://hai.stanford.edu/news/rss.xml' },
    { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
    { name: 'VentureBeat AI', url: 'https://venturebeat.com/category/ai/feed/' },
    { name: 'McKinsey Insights', url: 'https://www.mckinsey.com/featured-insights/rss.xml' }
];

// ─── CORE ENGINE ──────────────────────────────────────────────────────────────
class IntelligenceSystem {
    async fetchAggregatedNews() {
        console.log("📡 Aggregating global data streams...");
        let allNews = [];
        
        // Paralel olaraq ən aktiv 3 mənbədən məlumat çəkirik
        const selectedSources = SOURCES.sort(() => 0.5 - Math.random()).slice(0, 3);
        
        for (const src of selectedSources) {
            try {
                const res = await axios.get(src.url, { timeout: 12000 });
                const blocks = res.data.split('<item>').slice(1, 3); // Hər mənbədən 2 xəbər
                const parsed = blocks.map(b => ({
                    title: b.match(/<title>(.*?)<\/title>/)?.[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim(),
                    link: b.match(/<link>(.*?)<\/link>/)?.[1] || "#",
                    source: src.name
                }));
                allNews.push(...parsed);
            } catch (e) { console.warn(`⚠️ Source ${src.name} bypassed.`); }
        }
        return allNews.slice(0, CONFIG.NEWS_LIMIT);
    }

    async strategicAnalysis(news) {
        console.log(`🧠 Deep Strategic Analysis for: ${news.title.substring(0, 35)}...`);
        const prompt = `As a World-Class Strategy Consultant (McKinsey/BCG level), analyze this: "${news.title}".
        Provide a comprehensive report in JSON format with these exact keys:
        - overview: Detailed summary of the innovation.
        - sector_deployment: How is this specific AI tech being applied in sectors like Energy, Finance, or Logistics? (Specific examples).
        - market_disruption: Who loses and who wins in the global market?
        - strategic_imperative: 2-3 high-level recommendations for national-level digital leaders.
        - metrics: { innovation: 1-10, scalability: 1-10, disruption_risk: 1-10 }`;

        const res = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            response_format: { type: "json_object" },
            temperature: 0.2
        });
        return JSON.parse(res.choices[0].message.content);
    }

    async generatePDF(data) {
        return new Promise(async (resolve) => {
            const doc = new PDFDocument({ margin: 40, size: 'A4' });
            const stream = fs.createWriteStream(CONFIG.PDF_PATH);
            doc.pipe(stream);

            // Cover Page / Header
            doc.rect(0, 0, 612, 120).fill('#002147'); // Oxford Blue
            doc.fillColor('#FFFFFF').fontSize(26).font('Helvetica-Bold').text('STRATEGIC AI INTELLIGENCE', 40, 45);
            doc.fontSize(10).font('Helvetica').fillColor('#E5E5E5').text(`EXECUTIVE REPORT | VERSION 8.0 | ${new Date().toDateString()}`, 40, 75);

            data.forEach((entry, i) => {
                doc.addPage();
                
                // Content Title & Meta
                doc.fillColor('#002147').fontSize(18).font('Helvetica-Bold').text(`${i + 1}. ${entry.title}`, 40, 50);
                doc.fontSize(9).fillColor('#666666').font('Helvetica').text(`ORIGIN: ${entry.source} | URL: ${entry.link}`);
                doc.moveDown(1.5);

                // Section 1: Strategic Overview
                doc.fillColor('#002147').fontSize(12).font('Helvetica-Bold').text('I. STRATEGIC OVERVIEW');
                doc.fillColor('#333333').fontSize(10.5).font('Helvetica').text(entry.analysis.overview, { align: 'justify' });
                doc.moveDown(1.5);

                // Section 2: Industry Deployment (NEW!)
                doc.rect(40, doc.y, 532, 70).fill('#F0F4F8');
                doc.fillColor('#004085').fontSize(11).font('Helvetica-Bold').text('II. SECTORAL AI DEPLOYMENT & USE CASES', 50, doc.y + 10);
                doc.fillColor('#222222').fontSize(10).font('Helvetica').text(entry.analysis.sector_deployment, { width: 510 });
                doc.moveDown(4);

                // Section 3: Market Dynamics
                doc.fillColor('#002147').fontSize(12).font('Helvetica-Bold').text('III. MARKET DYNAMICS & DISRUPTION');
                doc.fillColor('#333333').font('Helvetica').text(entry.analysis.market_disruption, { align: 'justify' });
                doc.moveDown(1.5);

                // Section 4: National Strategic Imperative
                doc.fillColor('#D4380D').fontSize(12).font('Helvetica-Bold').text('IV. NATIONAL STRATEGIC IMPERATIVE');
                doc.fillColor('#1A1A1A').font('Helvetica').text(entry.analysis.strategic_imperative, { lineGap: 3 });

                // Metrics Footer for each page
                const m = entry.analysis.metrics;
                doc.fontSize(8).fillColor('#999999').text(`METRICS >> Innovation: ${m.innovation}/10 | Scalability: ${m.scalability}/10 | Disruption Risk: ${m.disruption_risk}/10`, 40, 780);
            });

            doc.end();
            stream.on('finish', () => resolve(CONFIG.PDF_PATH));
        });
    }

    async run() {
        try {
            const rawNews = await this.fetchAggregatedNews();
            const compiledData = [];
            for (const n of rawNews) {
                const analysis = await this.strategicAnalysis(n);
                compiledData.push({ ...n, analysis });
            }

            const pdf = await this.generatePDF(compiledData);

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user: CONFIG.RECIPIENT, pass: CONFIG.EMAIL_PASS }
            });

            await transporter.sendMail({
                from: `"OpenClew Intelligence" <${CONFIG.RECIPIENT}>`,
                to: CONFIG.RECIPIENT,
                subject: `💼 ENTERPRISE STRATEGY BRIEF — ${new Date().toLocaleDateString('en-US')}`,
                html: `<h3>Zöhrab Bey,</h3><p>Your comprehensive <b>Intelligence Briefing</b> is ready. This edition focuses on <b>Sectoral AI Deployment</b> and global market shifts.</p>`,
                attachments: [{ filename: 'Global_Intelligence_V8.pdf', path: pdf }]
            });

            console.log("🏁 Global Intelligence Cycle Finished.");
        } catch (err) {
            console.error("❌ System Halted:", err.message);
            process.exit(1);
        }
    }
}

new IntelligenceSystem().run();
