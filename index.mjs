import axios from 'axios';
import Groq from 'groq-sdk';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import fs from 'fs';

// --- [DİQQƏT: API VƏ EMAİL] ---
const API_KEY = process.env.GROQ_API_KEY || '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';
const EMAIL_USER = 'zohrab.rza@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS; // Bunu GitHub Secrets-dən götürəcək

const groq = new Groq({ apiKey: API_KEY });

async function start() {
    console.log("🚀 Agent oyanır...");
    try {
        const res = await axios.get('https://rss.arxiv.org/rss/cs.AI');
        const items = res.data.split('<item>').slice(1, 4);
        let results = [];

        for (const item of items) {
            const title = (item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:]]>)?<\/title>/) || [])[1];
            const link = (item.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:]]>)?<\/link>/) || [])[1];

            console.log(`🤖 AI Analiz edir: ${title.substring(0, 30)}...`);
            const aiRes = await groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: 'Sən Azərbaycanın Rəqəmsal Strateqisən. Akademik dildə yaz.' },
                    { role: 'user', content: `Analiz et: "${title}"` }
                ]
            });
            results.push({ title, url: link, summary: aiRes.choices[0].message.content });
        }

        const doc = new PDFDocument();
        const pdfPath = 'Report.pdf';
        const stream = fs.createWriteStream(pdfPath);
        doc.pipe(stream);
        doc.fontSize(20).text('OpenClew Strateji Hesabat', { align: 'center' });
        results.forEach(r => {
            doc.moveDown().fontSize(12).fillColor('blue').text(r.title, { link: r.url });
            doc.fontSize(10).fillColor('black').text(r.summary);
        });
        doc.end();

        stream.on('finish', async () => {
            console.log("📧 Email göndərilir...");
            let transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user: EMAIL_USER, pass: EMAIL_PASS }
            });

            await transporter.sendMail({
                from: EMAIL_USER,
                to: EMAIL_USER,
                subject: `🚀 OpenClew - ${new Date().toLocaleDateString('az-AZ')}`,
                attachments: [{ filename: 'Report.pdf', path: pdfPath }]
            });
            console.log("✅ BİTDİ!");
        });
    } catch (e) {
        console.error("❌ XƏTA:", e.message);
        process.exit(1);
    }
}
start();
