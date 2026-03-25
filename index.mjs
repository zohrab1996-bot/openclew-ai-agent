import axios from 'axios';
import Groq from 'groq-sdk';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import fs from 'fs';

// --- [SƏNİN TƏZƏ VƏ YOXLANILMIŞ AÇARIN] ---
const API_KEY = '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'; 
const USER_EMAIL = 'zohrab.rza@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS; 

const groq = new Groq({ apiKey: API_KEY });

async function startMission() {
    console.log("🚀 OpenClew Agent təzə açarla işə düşür...");
    try {
        const res = await axios.get('https://rss.arxiv.org/rss/cs.AI');
        const items = res.data.split('<item>').slice(1, 4); 
        let results = [];

        for (const item of items) {
            const titleMatch = item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:]]>)?<\/title>/);
            const title = titleMatch ? titleMatch[1].trim() : "Mövzu tapılmadı";

            console.log(`🤖 AI Analiz edir: ${title.substring(0, 30)}...`);
            const aiRes = await groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: 'Sən Azərbaycanın Rəqəmsal Strateqisən. Akademik dildə yaz.' },
                    { role: 'user', content: `Analiz et: "${title}"` }
                ]
            });
            results.push({ title, summary: aiRes.choices[0].message.content });
        }

        const doc = new PDFDocument();
        const pdfPath = 'Report.pdf';
        const stream = fs.createWriteStream(pdfPath);
        doc.pipe(stream);
        doc.fontSize(20).text('OpenClew Strateji Hesabat', { align: 'center' });
        results.forEach(r => {
            doc.moveDown().fontSize(12).fillColor('blue').text(r.title);
            doc.fontSize(10).fillColor('black').text(r.summary);
        });
        doc.end();

        stream.on('finish', async () => {
            if (!EMAIL_PASS) {
                console.log("⚠️ PDF yarandı, amma EMAIL_PASS yoxdur.");
                return;
            }
            let transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: USER_EMAIL, pass: EMAIL_PASS } });
            await transporter.sendMail({
                from: USER_EMAIL,
                to: USER_EMAIL,
                subject: `🚀 OpenClew - ${new Date().toLocaleDateString('az-AZ')}`,
                attachments: [{ filename: 'Report.pdf', path: pdfPath }]
            });
            console.log("✅ MİSSİYA UĞURLA TAMAMLANDI!");
        });
    } catch (error) {
        console.error("❌ KRİTİK XƏTA:", error.message);
        process.exit(1);
    }
}
startMission();
