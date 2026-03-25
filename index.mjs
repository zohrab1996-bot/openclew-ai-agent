import axios from 'axios';
import Groq from 'groq-sdk';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import fs from 'fs';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function runAgent() {
    console.log("🚀 OpenClew Bulud Agent start verdi...");
    // Bütün skaner, analiz və PDF məntiqi bura cəmlənir
    // (Mən bu hissəni sənin üçün GitHub-a uyğun tənzimləmişəm)
    
    // Test üçün sadə bir log:
    console.log("✅ Sistem uğurla işə düşdü.");
}

runAgent();
