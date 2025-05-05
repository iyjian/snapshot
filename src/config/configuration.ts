export default (): any => ({
  oss: {
    region: process.env.OSS_REGIN,
    accessKeyId: process.env.OSS_ACCESSKEY_ID,
    accessKeySecret: process.env.OSS_ACCESSKEY_SECRET,
    bucket: process.env.OSS_BUCKET,
    internal: process.env.OSS_INTERNAL === 'true',
  },
});
