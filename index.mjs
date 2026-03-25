import axios from 'axios';
import Groq from 'groq-sdk';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import fs from 'fs';

/**
 * @const CONFIG
 * Enterprise Configuration Object
 */
const CONFIG = {
    API_KEY: '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',
    IDENTITY: {
        name: 'OpenClew Sovereign Strategist',
        version: '3.0.0-Stable',
        author: 'Zöhrab Rzazadə',
        organization: 'Ministry of Digital Development and Transport (MDDT)'
    },
    RECIPIENT: 'zohrab.rza@gmail.com',
    EMAIL_PASS: process.env.EMAIL_PASS,
    SOURCES: [
        { id: 'arXiv', url: 'https://rss.arxiv.org/rss/cs.AI', weight: 1.0 },
        { id: 'MIT', url: 'https://www.technologyreview.com/feed/', weight: 1.2 },
        { id: 'GoogleAI', url: 'http://feeds.feedburner.com/blogspot/gmfb', weight: 1.5 },
        { id: 'DeepMind', url: 'https://deepmind.google/blog/rss.xml', weight: 1.5 },
        { id: 'Stanford', url: 'https://hai.stanford.edu/news/rss.xml', weight: 1.1 },
        { id: 'TechCrunch', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', weight: 0.8 },
        { id: 'Wired', url: 'https://www.wired.com/feed/category/gear/latest/rss', weight: 0.9 },
        { id: 'OpenAI', url: 'https://openai.com/news/rss.xml', weight: 1.5 },
        { id: 'WEF', url: 'https://www.weforum.org/agenda/feed', weight: 1.3 },
        { id: 'CSET', url: 'https://cset.georgetown.edu/feed/', weight: 1.4 }
    ]
};

// Character mapping for clean PDF output (Unicode Resilience)
const clean = (str) => {
    const map = { 'ə': 'e', 'Ə': 'E', 'ğ': 'g', 'Ğ': 'G', 'ç': 'c', 'Ç': 'C', 'ş': 's', 'Ş': 'S', 'ı': 'i', 'İ': 'I', 'ö': 'o', 'Ö': 'O' };
    return str.replace(/[əƏğĞçÇşŞıİöÖ]/g, m => map[m]);
};

class OpenClewAgent {
    constructor() {
        this.groq = new Groq({ apiKey: CONFIG.API_KEY });
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: CONFIG.RECIPIENT, pass: CONFIG.EMAIL_PASS }
        });
    }

    async fetchData() {
        const source = CONFIG.SOURCES[Math.floor(Math.random() * CONFIG.SOURCES.length)];
        console.log(`[LOG] Sourcing intelligence from: ${source.id} (${source.url})`);
        
        const response = await axios.get(source.url, { timeout: 15000 });
        const items = response.data.split('<item>').slice(1, 4);
        
        return items.map(item => ({
            title: (item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:]]>)?<\/title>/) || ["","N/A"])[1].trim(),
            link: (item.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:]]>)?<\/link>/) || ["","#"])[1].trim(),
            origin: source.id
        }));
    }

    async generateAnalysis(news) {
        console.log(`[LOG] Initializing LLM Analysis Engine for ${news.length} vectors...`);
        
        const prompt = `Sən Azərbaycan Respublikasının Rəqəmsal Transformasiya üzrə Baş Strateqisən. 
        Mövzu: "${news.title}"
        Tələblər:
        1. KONSEPTUAL ANALİZ: Texnologiyanın qlobal əhəmiyyəti.
        2. MİLLİ ADAPTASİYA: Azərbaycanın rəqəmsal ekosistemi, bulud infrastrukturu və innovasiya mərkəzləri üçün potensialı.
        3. İCRAÇI XÜLASƏ: Nazirlik səviyyəsində qərar qəbulu üçün konkret tövsiyə.
        Dil: Akademik, rəsmi, dövlət əhəmiyyətli.`;

        const chatCompletion = await this.groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.5, // High precision
        });

        return chatCompletion.choices[0].message.content;
    }

    async compileReport(data) {
        return new Promise((resolve) => {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const path = 'OpenClew_Intelligence_Report.pdf';
            const stream = fs.createWriteStream(path);
            
            doc.pipe(stream);

            // Header - Professional Corporate Style
            doc.rect(0, 0, 612, 100).fill('#002b5c'); // Deep Corporate Blue
            doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold').text('STRATEJI KESFIYYAT HESABATI', 50, 40);
            doc.fontSize(10).font('Helvetica').text(`${CONFIG.IDENTITY.name} v${CONFIG.IDENTITY.version}`, 50, 70);
            doc.moveDown(4);

            data.forEach((entry, index) => {
                doc.fillColor('#002b5c').fontSize(16).font('Helvetica-Bold').text(`${index + 1}. ${clean(entry.title)}`);
                doc.fontSize(9).fillColor('#666666').text(`Menbe: ${entry.origin} | İstinad: ${entry.link}`);
                doc.moveDown(0.5);
                doc.fillColor('#333333').fontSize(11).font('Helvetica').text(clean(entry.analysis), { align: 'justify', lineGap: 2 });
                doc.moveDown(2);
                doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#eeeeee').stroke();
                doc.moveDown(1.5);
            });

            // Footer
            doc.fontSize(8).fillColor('#999999').text(`Tərtib edib: ${CONFIG.IDENTITY.author} | MDDT Digital Hub`, 50, 780, { align: 'center' });
            
            doc.end();
            stream.on('finish', () => resolve(path));
        });
    }

    async run() {
        try {
            const rawNews = await this.fetchData();
            const analyzedData = await Promise.all(rawNews.map(async (n) => ({
                ...n,
                analysis: await this.generateAnalysis(n)
            })));

            const reportPath = await this.compileReport(analyzedData);

            await this.transporter.sendMail({
                from: `"${CONFIG.IDENTITY.name}" <${CONFIG.RECIPIENT}>`,
                to: CONFIG.RECIPIENT,
                subject: `🚀 STRATEJI HESABAT: ${new Date().toLocaleDateString('az-AZ')}`,
                text: `Zöhrab bəy,\n\n${new Date().toLocaleDateString('az-AZ')} tarixinə olan texnoloji kəşfiyyat hesabatı əlavədədir.\n\nSistem: ${CONFIG.IDENTITY.version}\nStatus: Uğurlu`,
                attachments: [{ filename: 'Intelligence_Report.pdf', path: reportPath }]
            });

            console.log(`[SUCCESS] Intelligence Cycle Completed for ${CONFIG.IDENTITY.author}`);
        } catch (err) {
            console.error(`[CRITICAL_FAILURE] ${err.stack}`);
            process.exit(1);
        }
    }
}

new OpenClewAgent().run();
