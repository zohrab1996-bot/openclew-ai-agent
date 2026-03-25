import axios from 'axios';
import Groq from 'groq-sdk';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import fs from 'fs';

// --- [STRATEJİ KONFİQURASİYA] ---
// Əgər GitHub Secrets-də yoxdursa, birbaşa bu açardan istifadə edəcək
const API_KEY = process.env.GROQ_API_KEY || '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';
const EMAIL_USER = 'zohrab.rza@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS;

const groq = new Groq({ apiKey: API_KEY });

async function startMission() {
    console.log("🚀 OpenClew Strateji Agent oyanır...");
    
    try {
        // 1. Mənbələri skan et (arXiv AI elmi mənbəyi)
        console.log("🌐 Qlobal elmi mənbələr skan edilir...");
        const res = await axios.get('https://rss.arxiv.org/rss/cs.AI');
        const items = res.data.split('<item>').slice(1, 4); 
        let results = [];

        for (const item of items) {
            const title = (item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:]]>)?<\/title>/) || [])[1];
            const link = (item.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:]]>)?<\/link>/) || [])[1];

            // 2. AI Analizi (Akademik Azərbaycan dili)
            console.log(`🤖 Analiz aparılır: ${title.substring(0, 40)}...`);
            const aiRes = await groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: 'Sən Azərbaycan Respublikasının Rəqəmsal Strateqisən. Dilin rəsmi, akademik və dövlət əhəmiyyətli sənəd üslubundadır. "ə, ö, ğ, ç, ş, ı, İ" hərflərindən qüsursuz istifadə et.' },
                    { role: 'user', content: `Bu texnoloji yeniliyi təhlil et və rəqəmsal suverenlik baxımından tövsiyə ver: "${title}"` }
                ]
            });
            results.push({ title, url: link, summary: aiRes.choices[0].message.content });
        }

        // 3. PDF Faylının Yaradılması
        console.log("📄 PDF hesabat hazırlanır...");
        const doc = new PDFDocument({ margin: 50 });
        const pdfPath = 'OpenClew_Report.pdf';
        const stream = fs.createWriteStream(pdfPath);
        doc.pipe(stream);

        doc.fontSize(25).fillColor('#1a237e').text('OpenClew Strateji Hesabat', { align: 'center' });
        doc.fontSize(10).fillColor('gray').text(`Tarix: ${new Date().toLocaleString('az-AZ')}`, { align: 'center' });
        doc.moveDown(2);

        results.forEach(r => {
            doc.fontSize(14).fillColor('#0d47a1').text(r.title, { link: r.url, underline: true });
            doc.moveDown(0.5);
            doc.fontSize(11).fillColor('black').text(r.summary, { align: 'justify' });
            doc.moveDown(1.5);
        });
        doc.end();

        // 4. Email Göndərilməsi
        stream.on('finish', async () => {
            console.log("📧 Hesabat emailə göndərilir...");
            if (!EMAIL_PASS) {
                console.error("❌ EMAIL_PASS tapılmadı! GitHub Secrets-i yoxla.");
                return;
            }

            let transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user: EMAIL_USER, pass: EMAIL_PASS }
            });

            await transporter.sendMail({
                from: `OpenClew AI <${EMAIL_USER}>`,
                to: EMAIL_USER,
                subject: `🚀 Strateji Analiz: ${new Date().toLocaleDateString('az-AZ')}`,
                text: 'Zöhrab bəy, günün elmi-texnoloji analizi əlavədədir.',
                attachments: [{ filename: 'OpenClew_Report.pdf', path: pdfPath }]
            });
            console.log("🏁 MİSSİYA UĞURLA TAMAMLANDI!");
        });

    } catch (error) {
        console.error("❌ KRİTİK XƏTA:", error.message);
        process.exit(1);
    }
}

startMission();
