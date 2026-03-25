import axios from 'axios';
import Groq from 'groq-sdk';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import fs from 'fs';

// --- [KONFİQURASİYA] ---
const API_KEY = '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'; 
const USER_EMAIL = 'zohrab.rza@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS; 

const groq = new Groq({ apiKey: API_KEY });

// Şriftlərdəki qəribə simvolları təmizləmək üçün köməkçi funksiya
function cleanText(text) {
    return text
        .replace(/ə/g, 'e').replace(/Ə/g, 'E')
        .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
        .replace(/ç/g, 'c').replace(/Ç/g, 'C')
        .replace(/ş/g, 's').replace(/Ş/g, 'S')
        .replace(/ı/g, 'i').replace(/İ/g, 'I')
        .replace(/ö/g, 'o').replace(/Ö/g, 'O');
}

async function startMission() {
    console.log("🚀 OpenClew Agent hesabatı hazırlayır...");
    try {
        // 1. Mənbə Skaneri
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
                    { role: 'system', content: 'Sən Azərbaycanın Rəqəmsal Strateqisən. Hesabatı sadə və oxunaqlı dildə yaz.' },
                    { role: 'user', content: `Analiz et: "${title}"` }
                ]
            });
            results.push({ title, summary: aiRes.choices[0].message.content });
        }

        // 2. PDF Yaradılması (Simvol dəstəyi ilə)
        console.log("📄 PDF faylı hazırlanır...");
        const doc = new PDFDocument({ margin: 50 });
        const pdfPath = 'OpenClew_Report.pdf';
        const stream = fs.createWriteStream(pdfPath);
        doc.pipe(stream);

        doc.font('Helvetica-Bold').fontSize(22).fillColor('#1a237e').text('OpenClew Strateji Hesabat', { align: 'center' });
        doc.font('Helvetica').fontSize(10).fillColor('gray').text(`Tarix: ${new Date().toLocaleDateString('az-AZ')}`, { align: 'center' });
        doc.moveDown(2);

        results.forEach(r => {
            // Başlıqları və mətni təmizləyib yazırıq ki, PDF-də qəribə görünməsin
            doc.font('Helvetica-Bold').fontSize(14).fillColor('#0d47a1').text(cleanText(r.title));
            doc.moveDown(0.5);
            doc.font('Helvetica').fontSize(11).fillColor('black').text(cleanText(r.summary), { align: 'justify' });
            doc.moveDown(1.5);
        });
        doc.end();

        // 3. Email Göndərilməsi
        stream.on('finish', async () => {
            if (!EMAIL_PASS) {
                console.log("⚠️ EMAIL_PASS tapılmadı, amma PDF yarandı.");
                return;
            }
            let transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user: USER_EMAIL, pass: EMAIL_PASS }
            });

            await transporter.sendMail({
                from: `OpenClew AI <${USER_EMAIL}>`,
                to: USER_EMAIL,
                subject: `🚀 OpenClew Analiz - ${new Date().toLocaleDateString('az-AZ')}`,
                text: 'Zöhrab bəy, günün texnoloji analizi təmizlənmiş formatda əlavədədir.',
                attachments: [{ filename: 'OpenClew_Report.pdf', path: pdfPath }]
            });
            console.log("✅ MİSSİYA UĞURLA TAMAMLANDI!");
        });

    } catch (error) {
        console.error("❌ KRİTİK XƏTA:", error.message);
        process.exit(1);
    }
}

startMission();
