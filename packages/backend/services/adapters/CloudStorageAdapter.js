const {
  CLOUD_BUCKET,
  CLOUD_REGION,
  CLOUD_ACCESS_KEY,
  CLOUD_SECRET_KEY,
  CLOUD_ENDPOINT,
  CLOUD_PUBLIC_URL,
  STORAGE_CATEGORIES
} = require('../../config/storage');

class CloudStorageAdapter {
  constructor() {
    this.bucket = CLOUD_BUCKET;
    this.region = CLOUD_REGION;
    this.publicUrl = CLOUD_PUBLIC_URL;
    this.client = null;

    if (CLOUD_ACCESS_KEY && CLOUD_SECRET_KEY) {
      this._initClient();
    }
  }

  _initClient() {
    try {
      const { S3Client } = require('@aws-sdk/client-s3');
      this.client = new S3Client({
        region: this.region,
        endpoint: CLOUD_ENDPOINT || undefined,
        credentials: {
          accessKeyId: CLOUD_ACCESS_KEY,
          secretAccessKey: CLOUD_SECRET_KEY
        }
      });
      console.log('[CloudStorage] S3 client initialized');
    } catch (err) {
      console.warn('[CloudStorage] S3 client not available, using HTTP fallback:', err.message);
      this.client = null;
    }
  }

  async save(category, fileName, data) {
    const config = STORAGE_CATEGORIES[category];
    if (!config) throw new Error(`Unknown storage category: ${category}`);

    const key = `${config.dir}/${fileName}`;

    if (this.client) {
      const { PutObjectCommand } = require('@aws-sdk/client-s3');
      const body = Buffer.isBuffer(data) ? data : Buffer.from(data);
      await this.client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body
      }));
    } else {
      await this._httpUpload(key, data);
    }

    return {
      success: true,
      fileKey: key,
      url: this.getUrl(category, fileName)
    };
  }

  async read(category, fileName) {
    const config = STORAGE_CATEGORIES[category];
    if (!config) throw new Error(`Unknown storage category: ${category}`);

    const key = `${config.dir}/${fileName}`;

    if (this.client) {
      const { GetObjectCommand } = require('@aws-sdk/client-s3');
      const result = await this.client.send(new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      }));
      return { success: true, stream: result.Body, size: result.ContentLength };
    }

    return { success: false, error: 'Cloud storage client not available' };
  }

  async delete(category, fileName) {
    const config = STORAGE_CATEGORIES[category];
    if (!config) throw new Error(`Unknown storage category: ${category}`);

    const key = `${config.dir}/${fileName}`;

    if (this.client) {
      const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
      await this.client.send(new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key
      }));
    }

    return { success: true };
  }

  async exists(category, fileName) {
    try {
      const config = STORAGE_CATEGORIES[category];
      if (!config) return false;

      const key = `${config.dir}/${fileName}`;

      if (this.client) {
        const { HeadObjectCommand } = require('@aws-sdk/client-s3');
        await this.client.send(new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key
        }));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async list(category, options = {}) {
    const config = STORAGE_CATEGORIES[category];
    if (!config) return [];

    const prefix = `${config.dir}/`;

    if (this.client) {
      const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
      const result = await this.client.send(new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: options.limit || 100
      }));
      return (result.Contents || []).map(obj => ({
        name: obj.Key.replace(prefix, ''),
        size: obj.Size,
        modified: obj.LastModified,
        url: `${this.publicUrl}/${obj.Key}`
      }));
    }

    return [];
  }

  getUrl(category, fileName) {
    const config = STORAGE_CATEGORIES[category];
    if (!config) return null;
    return `${this.publicUrl}/${config.dir}/${fileName}`;
  }

  async _httpUpload(key, data) {
    const axios = require('axios');
    const body = Buffer.isBuffer(data) ? data : Buffer.from(data);
    await axios.put(`${CLOUD_ENDPOINT}/${this.bucket}/${key}`, body, {
      headers: { 'Content-Type': 'application/octet-stream' }
    });
  }
}

module.exports = CloudStorageAdapter;
