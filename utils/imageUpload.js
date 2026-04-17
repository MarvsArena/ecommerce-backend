import cloudinary, { isCloudinaryConfigured } from "../config/cloudinary.js";

const uploadSingleFile = async (file) => {
  const dataUri = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
  const response = await cloudinary.uploader.upload(dataUri, {
    folder: "omd-hairville/products",
    resource_type: "image",
  });

  return response.secure_url;
};

export const uploadImages = async (files = []) => {
  if (!files.length) {
    return [];
  }

  if (!isCloudinaryConfigured) {
    throw new Error("Cloudinary is not configured. Add Cloudinary keys to upload files.");
  }

  return Promise.all(files.map(uploadSingleFile));
};
