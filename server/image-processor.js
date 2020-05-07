const request = require('request');
const cachedRequest = require('cached-request')(request);
const sharp = require('sharp');

cachedRequest.setCacheDirectory('/tmp/cache');

const imageProcessor = (req, res) => {
  const { url: imageUrl, offset, width: sheetWidth, height: sheetHeight, thumb } = req.query;
  if(!imageUrl || !offset || !sheetWidth || !sheetHeight) {
    res.sendStatus(400);
    return;
  }
  const thumbFactor = thumb ? 5 : 1;
  const remoteImageUrl = unescape(imageUrl);
  // const protocol = remoteImageUrl.startsWith('https') ? https : http;
  cachedRequest.get({
    url: remoteImageUrl,
    encoding: null,
    ttl: 30 * 60 * 1000 // 30 minutes
  }, function (err, response, body) {
    const image = sharp(body);
    image
      .metadata()
      .then(({ width, height, format }) => {
        // Calculate card size based on the sheet info and image dims
        const cardWidth = ~~(width / sheetWidth);
        const cardHeight = ~~(height / sheetHeight);
        const left = (offset % sheetWidth) * cardWidth;
        const top = Math.floor(offset / sheetWidth) * cardHeight;
        image
          .resize({
            width: ~~(width / thumbFactor),
            height: ~~(height / thumbFactor),
          })
          .extract({
            left: ~~(left / thumbFactor),
            top: ~~(top / thumbFactor),
            width: ~~(cardWidth / thumbFactor),
            height: ~~(cardHeight / thumbFactor)
          })
          .toBuffer()
          .then(data => {
            res.type(format);
            res.end(data);
          })
          .catch(err => {
            console.log(err);
            res.redirect('https://i.imgur.com/WwuvEPd.jpg');
          });
      })
      .catch(err => {
        console.log(err);
        res.redirect('https://i.imgur.com/WwuvEPd.jpg');
      });
  });
};

module.exports = imageProcessor;