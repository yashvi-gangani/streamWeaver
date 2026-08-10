# StreamWeaver Architecture

```text
                    React Frontend
                         |
             +-----------+-----------+
             |                       |
       Upload / Mapping       Progress Socket
             |                       |
             v                       ^
       Node.js Backend --------------+
             |
       Node.js Streams
             |
       Parse / Transform
             |
       Validate / Map
             |
       Batch Buffer
             |
       MongoDB bulkWrite
             |
       Processing Result
```

The pipeline should process data incrementally rather than loading the complete dataset into memory.
