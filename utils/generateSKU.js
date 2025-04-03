// export const generateSKU = (productName) => {
//     const randomNum = Math.floor(1000 + Math.random() * 9000);
//     const formattedName = productName.replace(/\s+/g, "-").toUpperCase();
//     return `${formattedName}-${randomNum}`;
//   };
  
export const generateSKU = (name) => {
  if (!name) {
      throw new Error("Product name is required for SKU generation");
  }
  return name.toUpperCase().replace(/\s+/g, "-") + "-" + Date.now();
};
