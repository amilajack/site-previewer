import { NextApiRequest, NextApiResponse } from 'next'
import puppeteer from 'puppeteer';
import validUrl from 'valid-url';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
   const { url } = req.query as { url: string };
   if (!validUrl.isUri(url)) {
      res.statusCode = 404
      res.setHeader('Content-Type', 'application/json')
      res.json({ error: 'Invalid URL' })
      return;
   }

   // Launch
   const browser = await puppeteer.launch();
   const page = await browser.newPage();
   await page.goto(url);
   const img = await page.screenshot({
      type: 'jpeg'
   });

   // Respond
   // Cache ttyl of 24hrs
   const maxAge = 60 * 60 * 60 * 24
   res.writeHead(200, {
      'Cache-Control': `s-maxage=${maxAge}, stale-while-revalidate`,
      'Content-Type': 'image/jpeg',
      'Content-Length': img.length
   });
   res.end(img)

   // Cleanup
   await browser.close();
}

export default handler
