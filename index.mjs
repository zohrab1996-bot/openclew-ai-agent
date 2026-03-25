import axios from 'axios';
import Groq from 'groq-sdk';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import fs from 'fs';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const EMAIL_CONFIG = {
    user: 'zohrab.rza@gmail.com',
    pass: process.env.EMAIL_PASS,
    to: 'zohrab.rza@gmail.com'
};

async function startMission() {
    console.log("🚀 Missiya başladı...");
    try {
        // 1. Mənbələri skan et
        const res = await axios.get('https://rss.arxiv.org/rss/cs.AI');
        const items = res.data.split('<item>').slice(1, 4);
        let summaries = [];

        for (const item of items) {
            const title = (item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:]]>)?<\/title>/) || [])[1];
            const link = (item.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:]]>)?<\/link>/) || [])[1];
            
            // 2. AI Analizi
            const aiRes = await groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: 'Sən Azərbaycanın Rəqəmsal Strateqisən. Akademik dildə yaz.' },
                    { role: 'user', content: `Analiz et: ${title}` }
                ]
            });
            summaries.push({ title, url: link, summary: aiRes.choices[0].message.content });
        }

        // 3. PDF Yarat
        const doc = new PDFDocument();
        const path = 'report.pdf';
        const stream = fs.createWriteStream(path);
        doc.pipe(stream);
        doc.text('OpenClew Strateji Hesabat', { align: 'center' });
        summaries.forEach(s => {
            doc.moveDown().fillColor('blue').text(s.title).fillColor('black').text(s.summary);
        });
        doc.end();

        // 4. Email Göndər
        stream.on('finish', async () => {
            let transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: EMAIL_CONFIG.user, pass: EMAIL_CONFIG.pass } });
            await transporter.sendMail({
                from: EMAIL_CONFIG.user,
                to: EMAIL_CONFIG.to,
                subject: '🚀 OpenClew Hesabatı',
                text: 'Hesabat əlavədədir.',
                attachments: [{ filename: 'Report.pdf', path: path }]
            });
            console.log("🏁 Hesabat göndərildi!");
        });

    } catch (error) {
        console.error("❌ Xəta:", error.message);
    }
}

startMission();
