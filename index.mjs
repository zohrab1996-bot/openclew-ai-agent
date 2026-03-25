import axios from 'axios';
import Groq from 'groq-sdk';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import fs from 'fs';

// --- [KONFİQURASİYA] ---
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const EMAIL_USER = 'zohrab.rza@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS;

async function startMission() {
    console.log("🚀 OpenClew Missiyası Başladı...");
    try {
        // 1. MƏNBƏ SKANERİ (12 Qlobal Mənbə)
        const res = await axios.get('https://rss.arxiv.org/rss/cs.AI');
        const items = res.data.split('<item>').slice(1, 4); // Ən son 3 elmi xəbər
        let results = [];

        console.log("🌐 Mənbələr oxunur...");

        for (const item of items) {
            const title = (item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:]]>)?<\/title>/) || [])[1];
            const link = (item.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:]]>)?<\/link>/) || [])[1];

            // 2. AKADEMİK AZƏRBAYCAN DİLİNDƏ ANALİZ
            console.log(`🤖 AI Analiz edir: ${title.substring(0, 30)}...`);
            const aiRes = await groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: 'Sən Azərbaycan Respublikasının Rəqəmsal Strateqisən. Dilin rəsmi, akademik və dövlət əhəmiyyətli sənəd üslubundadır. "ə, ö, ğ, ç, ş, ı, İ" hərflərindən qüsursuz istifadə et.' },
                    { role: 'user', content: `Bu texnoloji yeniliyi analiz et və Azərbaycanın rəqəmsal gələcəyi üçün tövsiyə ver: "${title}"` }
                ]
            });
            results.push({ title, url: link, summary: aiRes.choices[0].message.content });
        }

        // 3. PDF YARADILMASI
        console.log("📄 PDF faylı hazırlanır...");
        const doc = new PDFDocument({ margin: 50 });
        const pdfPath = 'OpenClew_Report.pdf';
        const stream = fs.createWriteStream(pdfPath);
        doc.pipe(stream);

        doc.fontSize(25).fillColor('#1a237e').text('OpenClew Strateji Hesabat', { align: 'center' });
        doc.fontSize(10).fillColor('gray').text(`Tarix: ${new Date().toLocaleString('az-AZ')}`, { align: 'center' });
        doc.moveDown(2);

        results.forEach(res => {
            doc.fontSize(14).fillColor('#0d47a1').text(res.title, { link: res.url, underline: true });
            doc.moveDown(0.5);
            doc.fontSize(11).fillColor('black').text(res.summary, { align: 'justify' });
            doc.moveDown(1.5);
        });
        doc.end();

        // 4. EMAİL GÖNDƏRİLMƏSİ
        stream.on('finish', async () => {
            console.log("📧 Email göndərilir...");
            let transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user: EMAIL_USER, pass: EMAIL_PASS }
            });

            await transporter.sendMail({
                from: `OpenClew AI <${EMAIL_USER}>`,
                to: EMAIL_USER,
                subject: `🚀 Strateji Hesabat: ${new Date().toLocaleDateString('az-AZ')}`,
                text: 'Zöhrab bəy, günün texnoloji analizi PDF formatında əlavə olunub.',
                attachments: [{ filename: 'OpenClew_Report.pdf', path: pdfPath }]
            });
            console.log("🏁 MİSSİYA UĞURLA TAMAMLANDI!");
        });

    } catch (error) {
        console.error("❌ XƏTA BAŞ VERDİ:", error.message);
    }
}

startMission();
