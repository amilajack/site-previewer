import { NextApiRequest, NextApiResponse } from 'next'
import validUrl from 'valid-url';
import chromium from 'chrome-aws-lambda';
import { Page } from 'puppeteer';

const waitTillHTMLRendered = async (page: Page, timeout = 30000) => {
   const checkDurationMsecs = 1000;
   const maxChecks = timeout / checkDurationMsecs;
   let lastHTMLSize = 0;
   let checkCounts = 1;
   let countStableSizeIterations = 0;
   const minStableSizeIterations = 3;
 
   while(checkCounts++ <= maxChecks){
     let html = await page.content();
     let currentHTMLSize = html.length; 
 
     let bodyHTMLSize = await page.evaluate(() => document.body.innerHTML.length);
 
     console.log('last: ', lastHTMLSize, ' <> curr: ', currentHTMLSize, " body html size: ", bodyHTMLSize);
 
     if(lastHTMLSize != 0 && currentHTMLSize == lastHTMLSize) 
       countStableSizeIterations++;
     else 
       countStableSizeIterations = 0; //reset the counter
 
     if(countStableSizeIterations >= minStableSizeIterations) {
       console.log("Page rendered fully..");
       break;
     }
 
     lastHTMLSize = currentHTMLSize;
     await page.waitFor(checkDurationMsecs);
   }  
 };

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
   const { url } = req.query as { url: string };
   if (!validUrl.isUri(url)) {
      res.statusCode = 404
      res.setHeader('Content-Type', 'application/json')
      res.json({ error: 'Invalid URL' })
      return;
   }

   // Launch
   const browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      ignoreHTTPSErrors: true,
    });
   const page = await browser.newPage();
   await page.goto(url, {
      waitUntil: 'domcontentloaded',
   });
   await page.waitFor('*')

   await waitTillHTMLRendered(page)
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
