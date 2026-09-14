declare module 'snowflake-id' {
    interface SnowflakeIdOptions {
    /** 机器 ID（0-1023），分布式部署时各实例需唯一 */
      mid?: number;
      /** 时间戳偏移量（毫秒），默认为 2026-03-01 00:00:00 */
      offset?: number;
    }
  
    class SnowflakeId {
      /** 创建雪花 ID 生成器 */
      constructor(options?: SnowflakeIdOptions);
      /** 生成雪花 ID 字符串（JS number 无法安全表示 64 位整数） */
      generate(): string;
    }
  
    export default SnowflakeId;
  }