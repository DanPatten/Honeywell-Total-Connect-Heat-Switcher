const puppeteer = require('puppeteer');
var inspect = require('util').inspect;
var loginInfo = require('./private.json');


(async () => {
    var browser = await puppeteer.launch({headless: false});
    var hwl = await browser.newPage();
    await hwl.setUserAgent("Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36");
    await hwl.setExtraHTTPHeaders({
        'accept-language': 'en-US,en;q=0.8'
      });
    await hwl.setViewport({width: 1200, height: 800, deviceScaleFactor: 1});

    await hwl.goto('https://mytotalconnectcomfort.com/portal');
    await hwl.waitFor(1000);
    await hwl.type('#UserName', loginInfo.auth.username, {delay: 0})
    await hwl.type('#Password', loginInfo.auth.password, {delay: 0})
    await hwl.evaluate(() => {
        document.querySelector('input[type="submit"]').click();
    });
    await hwl.waitForNavigation({waitUntil: 'networkidle2'})
    await hwl.waitFor(1000);

    var result = 0;
    const maxChecks = 10;

    //Check heat here, loop up to 10x if no temp is returned
    for (i = 1; i < maxChecks; i++) { 
        result = await CheckHeat(hwl);
        if (result !== 0) {
            break;
        }
        await hwl.waitFor(1000);
    }

    //Close Browser
    browser.close();
})();

//Check heat and switch between EMHEAT and HEAT as needed
async function CheckHeat(hwl) {
    const temp = await hwl.evaluate(() => {
        const element = document.querySelector('.OutdoorTempDisplay .DisplayValue');
        return element.textContent;
    });

    var system = await hwl.evaluate(() => {
        const element = document.querySelector('.SystemButtonOn');
        return element.textContent.trim();
    });
    

    //If current system is COOL or OFF then exit
    if (system !== 'EMHEAT' && system !== 'HEAT') {
        console.log('NOT HEATING - EXITING')
	    browser.close();
        return -1;
    }

    if(!isNaN(temp)){ 
        var ntemp = Number(temp);
        console.log('Outside Temp is ' + temp + ' degrees');

        //If 33+ use heat pump
        if(ntemp >= 33 && system !== 'HEAT') {
            console.log('Switching to heat pump (HEAT 33+)')
            //Select HEAT BUTTON
            await hwl.evaluate(() => {
                document.getElementById('HeatBtn').click();
            });
            //SUBMIT CHANGES
            await hwl.evaluate(() => {
                document.getElementById('SubmitBtn').click();
            });
        }
        else if (ntemp <= 32 && system !== 'EMHEAT') {         //Else if 32- use emergency heat
            console.log('Switching to furnace (EMHEAT 32-)')
            //SELECT EMHEAT BUTTON
            await hwl.evaluate(() => {
                document.getElementById('EMHeatBtn').click();
            });
            //SUBMIT CHANGES
            await hwl.evaluate(() => {
                document.getElementById('SubmitBtn').click();
            });
        }
        else {
            console.log('No change needed')
        }


    }
    else {
        console.log('Invalid temp: ' + temp)
        return 0;
    }
    return 1;
}