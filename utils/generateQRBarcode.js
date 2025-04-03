import QRCode from "qrcode";
import bwipJs from "bwip-js"; // Barcode Generator

export const generateQRCode = async (data) => {
  try {
    return await QRCode.toDataURL(data);
  } catch (error) {
    console.error("QR Code Generation Error:", error);
    return null;
  }
};

export const generateBarcode = async (data) => {
  return new Promise((resolve, reject) => {
    bwipJs.toBuffer(
      {
        bcid: "code128",
        text: data,
        scale: 3,
        height: 10,
        includetext: true,
        textxalign: "center",
      },
      (err, png) => {
        if (err) reject(err);
        else resolve(`data:image/png;base64,${png.toString("base64")}`);
      }
    );
  });
};
