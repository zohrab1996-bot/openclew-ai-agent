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
    IDENTITY: "OpenClew Global Intelligence OS v7.5",
    PDF_PATH: path.resolve('./Strategic_Intelligence_Full_Report.pdf'),
};

const groq = new Groq({ apiKey: CONFIG.API_KEY });

// ─── CORE ENGINE ──────────────────────────────────────────────────────────────
class IntelligenceAgent {
    constructor() {
        this.sources = [
            'https://openai.com/news/rss.xml',
            'https://deepmind.google/blog/rss.xml',
            'https://www.technologyreview.com/feed/',
            'https://techcrunch.com/category/artificial-intelligence/feed/',
            'https://openai.com/news/rss.xml'
        ];
    }

    async fetchNews() {
        const url = this.sources[Math.floor(Math.random() * this.sources.length)];
        console.log(`📡 Sourcing Data from: ${url}`);
        const res = await axios.get(url, { timeout: 10000 });
        const blocks = res.data.split('<item>').slice(1, 4);
        return blocks.map(b => ({
            title: b.match(/<title>(.*?)<\/title>/)?.[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() || "N/A",
            link: b.match(/<link>(.*?)<\/link>/)?.[1] || "#"
        }));
    }

    async deepAnalyze(news) {
        console.log(`🧠 Executing Multi-Vector Analysis: ${news.title.substring(0, 40)}...`);
        const prompt = `As a Senior Strategy Consultant, evaluate this AI development: "${news.title}".
        Provide JSON output ONLY with these EXACT keys:
        - executive_summary: 3 sentences on core impact.
        - strategic_implications: Deep analysis for government/enterprise sector.
        - actionable_recommendation: 1 specific next step.
        - metrics: { innovation: 1-10, risk: 1-10, feasibility: 1-10, impact: 1-10, urgency: 1-10 }
        
        Language: English. Tone: Executive, Visionary, Precise.`;

        const res = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            response_format: { type: "json_object" },
            temperature: 0.1 // Maximum stability
        });
        return JSON.parse(res.choices[0].message.content);
    }

    async createVisualPDF(data) {
        return new Promise(async (resolve) => {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const stream = fs.createWriteStream(CONFIG.PDF_PATH);
            doc.pipe(stream);

            // Dark Mode Executive Header
            doc.rect(0, 0, 612, 115).fill('#001529');
            doc.fillColor('#FFFFFF').fontSize(24).font('Helvetica-Bold').text('GLOBAL STRATEGIC INTELLIGENCE', 50, 40);
            doc.fontSize(10).font('Helvetica').fillColor('#1890ff').text(`DIGITAL STRATEGY UNIT | VER. ${new Date().toLocaleDateString()}`, 50, 70);

            for (const [i, entry] of data.entries()) {
                if (i > 0) doc.addPage();
                
                doc.moveDown(5).fillColor('#001529').fontSize(18).font('Helvetica-Bold').text(`${i + 1}. ${entry.title}`);
                doc.fontSize(8).fillColor('#1890ff').text(`SOURCE: ${entry.link}`, { underline: true });
                doc.moveDown(1.5);

                // QuickChart Radar Generation
                const m = entry.analysis.metrics;
                const chartConfig = {
                    type: 'radar',
                    data: {
                        labels: ['Innovation', 'Risk', 'Feasibility', 'Impact', 'Urgency'],
                        datasets: [{
                            label: 'Strategic Score',
                            data: [m.innovation, m.risk, m.feasibility, m.impact, m.urgency],
                            backgroundColor: 'rgba(24, 144, 255, 0.2)',
                            borderColor: 'rgb(24, 144, 255)',
                            pointBackgroundColor: 'rgb(24, 144, 255)'
                        }]
                    },
                    options: { scale: { ticks: { min: 0, max: 10 } } }
                };

                const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&width=300&height=200`;
                
                try {
                    const chartRes = await axios.get(chartUrl, { responseType: 'arraybuffer' });
                    doc.image(chartRes.data, 300, doc.y - 10, { width: 250 });
                } catch (e) { console.warn("Chart generation failed."); }

                // Textual Content
                doc.fillColor('#333333').fontSize(11).font('Helvetica-Bold').text('EXECUTIVE SUMMARY', 50, doc.y);
                doc.font('Helvetica').fontSize(10).text(entry.analysis.executive_summary, { width: 240, align: 'justify' });
                
                doc.moveDown(1.5).font('Helvetica-Bold').text('STRATEGIC IMPLICATIONS');
                doc.font('Helvetica').text(entry.analysis.strategic_implications, { align: 'justify' });

                doc.moveDown(1.5).fillColor('#D4380D').font('Helvetica-Bold').text('ACTIONABLE RECOMMENDATION');
                doc.font('Helvetica').text(entry.analysis.actionable_recommendation);

                // Status Bar at the bottom of entry
                doc.moveDown(2);
                doc.rect(50, doc.y, 512, 20).fill('#F5F5F5');
                doc.fillColor('#595959').fontSize(8).text(`INNOVATION: ${m.innovation}/10  |  URGENCY: ${m.urgency}/10  |  RISK LEVEL: ${m.risk > 7 ? 'HIGH' : 'CONTROLLED'}`, 60, doc.y - 14);
            }

            // Global Footer
            doc.fontSize(8).fillColor('#BFBFBF').text(`CONFIDENTIAL - MDDT INTERNAL USE ONLY - ${CONFIG.IDENTITY}`, 50, 785, { align: 'center' });
            
            doc.end();
            stream.on('finish', () => resolve(CONFIG.PDF_PATH));
        });
    }

    async run() {
        try {
            const rawNews = await this.fetchNews();
            const analyzedData = [];
            for (const n of rawNews) {
                const analysis = await this.deepAnalyze(n);
                analyzedData.push({ ...n, analysis });
            }

            const pdfPath = await this.createVisualPDF(analyzedData);
            
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user: CONFIG.RECIPIENT, pass: CONFIG.EMAIL_PASS }
            });

            await transporter.sendMail({
                from: `"OpenClew Strategist" <${CONFIG.RECIPIENT}>`,
                to: CONFIG.RECIPIENT,
                subject: `💼 STRATEGIC REPORT: ${new Date().toLocaleDateString('en-US')}`,
                html: `<h3>Zöhrab Bey,</h3><p>Today's intelligence report with visual risk/innovation assessments is attached.</p>`,
                attachments: [{ filename: 'Strategic_Brief_v7.pdf', path: pdfPath }]
            });

            console.log("🏁 Mission Successful. Report dispatched.");
        } catch (err) {
            console.error("❌ Critical System Failure:", err.message);
            process.exit(1);
        }
    }
}

new IntelligenceAgent().run();
