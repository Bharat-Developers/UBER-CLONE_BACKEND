import { S2 } from "s2-geometry";

export const getCell_Ids = ({ latitude, longitude }) => {
  try {
    const regions = [];
    //get key of current cell(location)
    var key = S2.latLngToKey(latitude, longitude, 12);
    //push current cell id in array
    regions.push(S2.keyToId(key).toString());

    //push next 15 and previous  15 cell ids
    for (let i = 1; i <= 15; i++) {
      regions.push(S2.keyToId(S2.stepKey(key, i)).toString());
      regions.push(S2.keyToId(S2.stepKey(key, -i)).toString());
    }

    return regions;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const getS2Id = async ({ latitude, longitude }) => {
  try {
    const send = await S2.keyToId(S2.latLngToKey(latitude, longitude, 12)).toString();
    console.log(send);
    return send;
  } catch (error) {
    console.log(error);
    return null;
  }
};
