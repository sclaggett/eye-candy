const { sqrt } = Math;

function getDiagonalLength(height, width) {
  return sqrt(height ** 2 + width ** 2);
}
exports.getDiagonalLength = getDiagonalLength;

function calcBarLifespan(speed, width, windowHeight, windowWidth) {
  const lifespan =
    (getDiagonalLength(windowHeight, windowWidth) + width) / speed;
  // console.log("calcBarLifespan",speed,width,windowHeight,windowWidth,lifespan)
  return lifespan;
}

exports.calcBarLifespan = calcBarLifespan;
