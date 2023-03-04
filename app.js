import puppeteer from "puppeteer-core";
import fs from "fs";
import axios from "axios";
import TelegramBot from 'node-telegram-bot-api';




const bot = new TelegramBot("6160872705:AAEfRlVJJ89tVc_aZI0G3-VDALupMchVpS0", {polling: true});




bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    await getImgs(text, chatId);


    const requestsList = fs.readdirSync("./images");
    for(let reqFolderName of requestsList) {
        fs.rmdir("./images/"+reqFolderName, (err) => {
            if(err) console.log(err);
            else console.log("Папка " + reqFolderName + " удалена!");
        });
    }
    // sendImages(chatId, "./images/"+text);
})




const sendImages = (chatId, folderPath) => {
    // Получаем список файлов в папке
    fs.readdir(folderPath, function(err, files) {
        if (err) {
            console.log(err);
            return;
        }
        async function botSendPhoto(iter) {
            if(iter >= files.length) {
                fs.rmdir(folderPath, (err) => {
                    console.log('Папка успешно удалена');
                });
                return;
            }
            try {
                await bot.sendPhoto(chatId, folderPath + "/" + files[iter]);
                fs.unlink(folderPath + "/" + files[iter], () => {console.log("deleted")});
            }
            catch(err) {
                console.log(err);
            }
            setTimeout(() => {
                botSendPhoto(++iter);
            }, 3000)
        }
        botSendPhoto(0);
    });
}




const downloadImage = async (imageUrl, folder, fileName) => {
    try {
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder);
        }
        console.log(imageUrl);
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });

        fs.writeFile(`${folder}/${fileName}`, response.data, 'binary', (err) => {
            if (err) {
                console.error(err);
            } else {
                console.log(`Image saved successfully`);
            }
        });

    } catch (err) {
        console.error(`Error downloading image: ${err.message}`);
    }
}




const getImgs = async (query, chatId) => {
    const browser = await puppeteer.launch(
        { 
            headless: true,
            executablePath: "./node_modules/chromium/lib/chromium/chrome-linux/chrome"
        }
    );
    const page = await browser.newPage();

    // await page.setUserAgent(
    //     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3"
    // );
    
    await page.goto(`https://www.google.com/search?q=${query}&tbm=isch`, { waitUntil: 'networkidle0' });

    let images = [];
    let iter = 0;
    while (iter < 10) {
        await page.evaluate(() => {
            window.scrollBy(0, 300);
        });
        await page.waitForTimeout(1000);
        iter++;
    }
    images = await page.$$('.wXeWr');

    for (let i = 1; i < images.length; i++) {
        let chanse;
        if(i < 10) chanse = 2
        else if(i < 30) chanse = 3
        else if(i >= 30) chanse = 6
        if(Math.floor(Math.random() * chanse) == 0) {
            try {
                console.log(i);
                const image = images[i];

                await image.click();
                await page.waitForTimeout(1500);

                // await page.waitForSelector('img.n3VNCb.pT0Scc.KAlRDb');

                let imageUrl = await page.$$eval('img.n3VNCb.pT0Scc.KAlRDb[src]', imgs => imgs.map(img => img.getAttribute('src')));
                imageUrl = imageUrl[0];
            
                const folder = './images/'+query;
                const fileName = `${query}_${i}.jpg`;
                await downloadImage(imageUrl, folder, fileName);
                setTimeout(async () => {
                    try {
                        await bot.sendPhoto(chatId, folder + "/" + fileName);
                        fs.unlink(folder + "/" + fileName, () => {
                            console.log("deleted");
                        });
                    }
                    catch(err) {
                        console.log(err.message);
                    }
                }, 3000);
            }
            catch(err) {
                console.log(err.message);
            }
        }
    }
  
    await browser.close();
}