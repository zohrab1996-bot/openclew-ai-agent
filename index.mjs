import axios from 'axios';
import Groq from 'groq-sdk';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import fs from 'fs';

const CONFIG = {
    API_KEY: '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',
    RECIPIENT: 'zohrab.rza@gmail.com',
    EMAIL_PASS: process.env.EMAIL_PASS,
    IDENTITY: "OpenClew AI Executive Strategist v5.0",
    // Azərbaycan şriftlərini dəstəkləyən font linki (Roboto)
    FONT_URL: 'https://github.com/google/fonts/raw/main/apache/roboto/Roboto-Regular.ttf',
    FONT_BOLD_URL: 'https://github.com/google/fonts/raw/main/apache/roboto/Roboto-Bold.ttf'
};

const groq = new Groq({ apiKey: CONFIG.API_KEY });

async function getIntelligence() {
    const sources = [
        'https://openai.com/news/rss.xml',
        'https://deepmind.google/blog/rss.xml',
        'https://www.technologyreview.com/feed/',
        'https://techcrunch.com/category/artificial-intelligence/feed/'
    ];
    const url = sources[Math.floor(Math.random() * sources.length)];
    const res = await axios.get(url);
    const entries = res.data.split('<item>').slice(1, 4);
    
    return entries.map(e => ({
        title: (e.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:]]>)?<\/title>/) || ["","N/A"])[1].trim(),
        link: (e.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:]]>)?<\/link>/) || ["","#"])[1].trim()
    }));
}

async function analyze(news) {
    const prompt = `Sən Azərbaycanın rəqəmsal transformasiya üzrə ən yüksək səviyyəli strateqisən. 
    Xəbər: "${news.title}"
    
    Tələblər:
    1. ANALİZ: Bu texnologiya qlobal bazarda nəyi dəyişir? (Qısa və konkret)
    2. AZƏRBAYCAN PERSPEKTİVİ: Ölkəmizdə rəqəmsal xidmətlər və ya innovasiya mərkəzləri üçün bu nə deməkdir? 
    3. TÖVSİYƏ: Nazirlik və ya rəhbər şəxslər üçün 1 cümləlik strateji qərar təklifi.
    
    Dil: Müasir Azərbaycan işgüzar dili. "ə, ö, ğ, ç, ş, ı, İ" hərflərindən qüsursuz istifadə et.`;

    const response = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2 // Maksimum ciddiyyət
    });
    return response.choices[0].message.content;
}

async function downloadFont(url, path) {
    const res = await axios.get(url, { responseType: 'arraybuffer' });
    fs.writeFileSync(path, res.data);
    return path;
}

async function createProfessionalPDF(data) {
    const regularFont = await downloadFont(CONFIG.FONT_URL, 'Roboto.ttf');
    const boldFont = await downloadFont(CONFIG.FONT_BOLD_URL, 'RobotoBold.ttf');

    return new Promise((resolve) => {
        const doc = new PDFDocument({ margin: 45, size: 'A4' });
        const path = 'Strategic_Intelligence.pdf';
        const stream = fs.createWriteStream(path);
        doc.pipe(stream);

        // Styling
        doc.rect(0, 0, 612, 85).fill('#002B5C'); 
        doc.fillColor('#FFFFFF').fontSize(22).font(boldFont).text('STRATEJİ İNSAYT HESABATI', 45, 30);
        doc.fontSize(9).font(regularFont).text(`Tarix: ${new Date().toLocaleDateString('az-AZ')} | ${CONFIG.IDENTITY}`, 45, 60);
        
        doc.moveDown(4.5);

        data.forEach((item, i) => {
            doc.fillColor('#002B5C').fontSize(14).font(boldFont).text(`${i+1}. ${item.title}`);
            doc.fontSize(8).fillColor('#666666').font(regularFont).text(`Mənbə: ${item.link}`, { underline: true });
            doc.moveDown(0.7);
            
            doc.fillColor('#222222').fontSize(11).font(regularFont).text(item.analysis, {
                align: 'justify',
                lineGap: 4
            });
            
            doc.moveDown(2);
            doc.moveTo(45, doc.y).lineTo(550, doc.y).strokeColor('#DDDDDD').lineWidth(0.5).stroke();
            doc.moveDown(1.5);
        });

        doc.fontSize(8).fillColor('#888888').text('Rəqəmsal İnkişaf və Nəqliyyat Nazirliyi - Daxili Strateji Hesabat', 45, 785, { align: 'center' });
        doc.end();
        stream.on('finish', () => resolve(path));
    });
}

async function main() {
    console.log("🚀 Senior Agent Mission Started...");
    try {
        const news = await getIntelligence();
        const results = [];
        for (const n of news) {
            console.log(`🧠 Processing: ${n.title}`);
            const analysis = await analyze(n);
            results.push({ ...n, analysis });
        }
        
        const pdf = await createProfessionalPDF(results);
        
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: CONFIG.RECIPIENT, pass: CONFIG.EMAIL_PASS }
        });

        await transporter.sendMail({
            from: `"OpenClew Strategist" <${CONFIG.RECIPIENT}>`,
            to: CONFIG.RECIPIENT,
            subject: `💼 STRATEJİ TEXNOLOJİ ANALİZ: ${new Date().toLocaleDateString('az-AZ')}`,
            text: `Hörmətli Zöhrab bəy, günün rəqəmsal transformasiya analizi əlavədədir.`,
            attachments: [{ filename: 'Intelligence_Report.pdf', path: pdf }]
        });
        console.log("🏁 Mission Successful.");
    } catch (err) {
        console.error("❌ CRITICAL ERROR:", err.message);
        process.exit(1);
    }
}

main();
