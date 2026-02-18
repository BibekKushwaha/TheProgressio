import { createRequire } from 'module';
const require = createRequire(import.meta.url);

async function test() {
    try {
        const pdfMod = require('pdf-parse');
        const PDFParse = pdfMod.PDFParse;

        console.log('Trying new PDFParse()...');
        const instance = new PDFParse();
        console.log('Instance keys:', Object.keys(instance));
        if (typeof instance.parse === 'function') {
            console.log('Has .parse() method!');
        } else {
            // Check prototypes
            const proto = Object.getPrototypeOf(instance);
            console.log('Prototype keys:', Object.keys(proto));
        }
    } catch (e) {
        console.error('Test failed:', e);
    }
}

test();
