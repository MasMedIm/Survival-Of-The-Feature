exports.handler = async () => {
  const variants = JSON.parse(process.env.VARIANT_URLS || "[]");
  const target = variants[Math.floor(Math.random() * variants.length)];
  return { statusCode: 302, headers: { Location: target } };
};
