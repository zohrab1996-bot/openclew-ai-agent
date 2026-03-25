import axios from 'axios';
import Groq from 'groq-sdk';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import fs from 'fs';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const USER_EMAIL = 'zohrab.rza@gmail.com';

async function start() {
    console.log("🚀 OpenClew Agent oyanır...");
    try {
        // 1. Mənbədən xəbər götürürük
        const res = await axios.get('https://rss.arxiv.org/rss/cs.AI');
        const items = res.data.split('<item>').slice(1, 4);
        let results = [];

        for (const item of items) {
            const title = (item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:]]>)?<\/title>/) || [])[1];
            const link = (item.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:]]>)?<\/link>/) || [])[1];

            // 2. AI Analizi (Akademik Azərbaycan dilində)
            console.log(`🤖 Analiz edilir: ${title.substring(0, 30)}...`);
            const aiRes = await groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: 'Sən Azərbaycan Respublikasının Rəqəmsal Strateqisən. Dilin rəsmi, akademik və dövlət əhəmiyyətli sənəd üslubundadır. "ə, ö, ğ, ç, ş, ı, İ" hərflərindən qüsursuz istifadə et.' },
                    { role: 'user', content: `Bu yeniliyi təhlil et: "${title}"` }
                ]
            });
            results.push({ title, url: link, summary: aiRes.choices[0].message.content });
        }

        // 3. PDF Hazırlayırıq
        const doc = new PDFDocument();
        const pdfPath = 'OpenClew_Report.pdf';
        const stream = fs.createWriteStream(pdfPath);
        doc.pipe(stream);
        doc.fontSize(20).text('OpenClew Strateji Hesabat', { align: 'center' });
        doc.moveDown();
        results.forEach(r => {
            doc.fontSize(12).fillColor('blue').text(r.title, { link: r.url });
            doc.fontSize(10).fillColor('black').text(r.summary);
            doc.moveDown();
        });
        doc.end();

        // 4. Email Göndəririk
        stream.on('finish', async () => {
            console.log("📧 Email göndərilir...");
            let transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user: USER_EMAIL, pass: process.env.EMAIL_PASS }
            });

            await transporter.sendMail({
                from: USER_EMAIL,
                to: USER_EMAIL,
                subject: `🚀 OpenClew Hesabat - ${new Date().toLocaleDateString('az-AZ')}`,
                attachments: [{ filename: 'Report.pdf', path: pdfPath }]
            });
            console.log("✅ MİSSİYA TAMAMLANDI!");
        });

    } catch (e) { console.error("❌ Xəta:", e.message); }
}

start();
