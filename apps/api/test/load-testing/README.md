# Load Testing Guide for CareCircle API

This directory contains load testing configurations using two popular tools: K6 and Artillery.

## Prerequisites

### K6 Installation
```bash
# macOS
brew install k6

# Windows (using Chocolatey)
choco install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /usr/share/keyrings/k6-archive-keyring.list
sudo apt-get update
sudo apt-get install k6
```

### Artillery Installation
```bash
npm install -g artillery
```

## Running Load Tests

### K6 Load Tests

#### 1. Smoke Test (1 VU for 1 minute)
```bash
k6 run --include-system-env-vars k6-load-test.js
```

#### 2. Load Test (Ramp up to 100 VUs)
```bash
K6_CLOUD_TOKEN=your_token k6 run --out cloud k6-load-test.js
```

#### 3. Stress Test (Ramp up to 200 VUs)
```bash
k6 run --vus 200 --duration 10m k6-load-test.js
```

#### 4. With Custom Base URL
```bash
BASE_URL=https://api.carecircle.com k6 run k6-load-test.js
```

### Artillery Load Tests

#### 1. Quick Test
```bash
artillery quick --count 10 --num 100 http://localhost:3001/api/v1/health
```

#### 2. Full Load Test
```bash
artillery run artillery-load-test.yml
```

#### 3. With Report Generation
```bash
artillery run --output report.json artillery-load-test.yml
artillery report report.json
```

#### 4. Against Production
```bash
artillery run --target https://api.carecircle.com artillery-load-test.yml
```

## Test Scenarios

### K6 Scenarios

1. **Smoke Test**: Minimal load to verify basic functionality
   - 1 VU for 1 minute
   - Validates all endpoints work correctly

2. **Load Test**: Normal expected load
   - Ramp up to 100 VUs over 5 minutes
   - Sustained load for 5 minutes
   - Identifies performance under normal conditions

3. **Stress Test**: Beyond normal capacity
   - Ramp up to 300 VUs
   - Identifies breaking point and recovery behavior

4. **Spike Test**: Sudden traffic surge
   - Quick ramp to 500 VUs
   - Tests system behavior during traffic spikes

### Artillery Scenarios

1. **User Authentication**: 30% of traffic
   - Login flow
   - Get current user profile

2. **Dashboard Load**: 40% of traffic
   - Fetch families
   - Fetch care recipients
   - Fetch notifications
   - Get unread count

3. **Medication Operations**: 20% of traffic
   - Fetch medications for care recipient

4. **WebSocket Connections**: 10% of traffic
   - Real-time event connections
   - Connection stability testing

## Performance Thresholds

Both test suites enforce the following performance requirements:

- **p95 Response Time**: < 500ms (95% of requests must complete within 500ms)
- **p99 Response Time**: < 1000ms (99% of requests must complete within 1 second)
- **Error Rate**: < 1% (Less than 1% of requests should fail)
- **Login Duration**: < 800ms (Authentication should be fast)

## Test Data

Test users are defined in `test-data.csv`:
- 5 pre-configured test users
- Each with email, password, and full name
- Can be extended with more users as needed

## Results Analysis

### K6 Results

K6 provides:
- Real-time console output with color-coded results
- HTML report (summary.html)
- JSON metrics for further analysis
- Grafana dashboards (if using k6 Cloud)

Key metrics to watch:
- `http_req_duration`: Request duration percentiles
- `http_req_failed`: Failed request rate
- `iterations`: Total completed scenarios
- `vus`: Virtual users at any time

### Artillery Results

Artillery provides:
- JSON report with detailed metrics
- HTML report (using `artillery report`)
- CSV export option
- Real-time statistics during test execution

Key metrics to watch:
- `scenariosCompleted`: Total scenarios executed
- `requestsCompleted`: Total HTTP requests
- `codes`: HTTP status code distribution
- `latency`: Response time statistics

## Best Practices

1. **Start Small**: Always run smoke tests first
2. **Gradual Increase**: Ramp up load gradually
3. **Monitor Backend**: Watch database, Redis, and API server metrics
4. **Test in Stages**: Run tests during off-peak hours
5. **Clean Data**: Reset test database between major test runs
6. **Realistic Scenarios**: Model actual user behavior patterns
7. **Think Time**: Include realistic pauses between requests

## Monitoring During Tests

While tests are running, monitor:

### Application Metrics
- CPU usage
- Memory usage
- Database connections
- Redis operations
- Response times

### Database Performance
```bash
# PostgreSQL
SELECT * FROM pg_stat_activity WHERE state = 'active';

# Check slow queries
SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;
```

### Redis Performance
```bash
# Connect to Redis
redis-cli

# Monitor commands
MONITOR

# Check stats
INFO stats
```

## Troubleshooting

### High Error Rates
- Check application logs
- Verify database connection pool size
- Check Redis connection limits
- Review rate limiting configuration

### Slow Response Times
- Identify slow endpoints
- Check database query performance
- Review Redis cache hit rate
- Monitor network latency

### Connection Timeouts
- Increase timeout values in test config
- Check server connection limits
- Verify load balancer configuration

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Load Tests
on:
  schedule:
    - cron: '0 2 * * *'  # Run nightly at 2 AM

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run K6 Load Test
        uses: grafana/k6-action@v0.3.0
        with:
          filename: apps/api/test/load-testing/k6-load-test.js
```

## Advanced Configuration

### Custom Metrics
Add custom metrics in K6:
```javascript
import { Trend } from 'k6/metrics';
const customMetric = new Trend('custom_duration');
customMetric.add(duration);
```

### Distributed Testing
Run tests from multiple locations:
```bash
# K6 Cloud
k6 cloud k6-load-test.js

# Artillery with multiple workers
artillery run --count 3 artillery-load-test.yml
```

## Resources

- [K6 Documentation](https://k6.io/docs/)
- [Artillery Documentation](https://www.artillery.io/docs)
- [Load Testing Best Practices](https://k6.io/docs/test-types/introduction/)
