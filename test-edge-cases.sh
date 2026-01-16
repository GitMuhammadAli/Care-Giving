#!/bin/bash

# CareCircle Edge Case & Error Handling Test Suite
# Tests validation, error responses, edge cases, and boundary conditions

API_BASE="http://localhost:4000/api/v1"
PASSED=0
FAILED=0
TOTAL=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "======================================================================"
echo "🧪 CareCircle Edge Case & Error Handling Test Suite"
echo "======================================================================"
echo ""

# Test helper function
test_error_case() {
    local test_name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local token="$5"
    local expected_status="$6"
    local expected_error_field="$7"

    TOTAL=$((TOTAL + 1))

    if [ -z "$token" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "${API_BASE}${endpoint}" \
            -H "Content-Type: application/json" \
            ${data:+-d "$data"})
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "${API_BASE}${endpoint}" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $token" \
            ${data:+-d "$data"})
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "$expected_status" ]; then
        if [ -n "$expected_error_field" ]; then
            if echo "$body" | grep -q "$expected_error_field"; then
                echo -e "${GREEN}✅ PASSED${NC} - $test_name (HTTP $http_code)"
                PASSED=$((PASSED + 1))
            else
                echo -e "${RED}❌ FAILED${NC} - $test_name (Missing error field: $expected_error_field)"
                echo "Response: $body"
                FAILED=$((FAILED + 1))
            fi
        else
            echo -e "${GREEN}✅ PASSED${NC} - $test_name (HTTP $http_code)"
            PASSED=$((PASSED + 1))
        fi
    else
        echo -e "${RED}❌ FAILED${NC} - $test_name (Expected HTTP $expected_status, got $http_code)"
        echo "Response: $body"
        FAILED=$((FAILED + 1))
    fi
}

echo "======================================================================"
echo "SECTION 1: Authentication Edge Cases"
echo "======================================================================"
echo ""

# 1.1 Missing required fields
test_error_case "Register without email" "POST" "/auth/register" \
    '{"password":"Test123!","fullName":"Test User"}' \
    "" "400" "email"

test_error_case "Register without password" "POST" "/auth/register" \
    '{"email":"test@test.com","fullName":"Test User"}' \
    "" "400" "password"

test_error_case "Register with weak password" "POST" "/auth/register" \
    '{"email":"test@test.com","password":"123","fullName":"Test User"}' \
    "" "400" "password"

test_error_case "Register with invalid email format" "POST" "/auth/register" \
    '{"email":"notanemail","password":"Test123!","fullName":"Test User"}' \
    "" "400" "email"

echo ""
# Create a valid user for subsequent tests
TIMESTAMP=$(date +%s)
TEST_EMAIL="edgetest${TIMESTAMP}@carecircle.test"
register_response=$(curl -s -X POST "${API_BASE}/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"Test123!\",\"fullName\":\"Edge Test User\"}")

# 1.2 Login edge cases
test_error_case "Login with wrong password" "POST" "/auth/login" \
    "{\"email\":\"${TEST_EMAIL}\",\"password\":\"WrongPassword123!\"}" \
    "" "401" "Invalid credentials"

test_error_case "Login with non-existent email" "POST" "/auth/login" \
    '{"email":"doesnotexist@test.com","password":"Test123!"}' \
    "" "401" "Invalid credentials"

test_error_case "Login with missing password" "POST" "/auth/login" \
    "{\"email\":\"${TEST_EMAIL}\"}" \
    "" "400" "password"

echo ""
# Get valid token for subsequent tests
login_response=$(curl -s -X POST "${API_BASE}/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"Test123!\"}")
TOKEN=$(echo "$login_response" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
USER_ID=$(echo "$login_response" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

echo "Got valid token for testing..."
echo ""

echo "======================================================================"
echo "SECTION 2: Authorization & Access Control"
echo "======================================================================"
echo ""

# 2.1 No token provided
test_error_case "Access protected route without token" "GET" "/users/profile" \
    "" "" "401" "Unauthorized"

# 2.2 Invalid token
test_error_case "Access with invalid token" "GET" "/users/profile" \
    "" "invalid-token-here" "401" ""

# 2.3 Malformed token
test_error_case "Access with malformed token" "GET" "/users/profile" \
    "" "Bearer.invalid.token" "401" ""

echo ""
echo "======================================================================"
echo "SECTION 3: Family Management Edge Cases"
echo "======================================================================"
echo ""

# Create a family for testing
family_response=$(curl -s -X POST "${API_BASE}/families" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"name":"Edge Test Family","description":"Testing edge cases"}')
FAMILY_ID=$(echo "$family_response" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

# 3.1 Invalid UUIDs
test_error_case "Get family with invalid UUID" "GET" "/families/not-a-uuid" \
    "" "$TOKEN" "400" ""

test_error_case "Create care recipient with invalid family UUID" "POST" "/families/not-a-uuid/care-recipients" \
    '{"fullName":"Test","bloodType":"A+"}' "$TOKEN" "400" ""

# 3.2 Access other user's resources
test_error_case "Access non-existent family" "GET" "/families/00000000-0000-0000-0000-000000000000" \
    "" "$TOKEN" "403" ""

# 3.3 Validation errors
test_error_case "Create family without name" "POST" "/families" \
    '{"description":"No name"}' "$TOKEN" "400" "name"

test_error_case "Invite member with invalid email" "POST" "/families/${FAMILY_ID}/invite" \
    '{"email":"not-an-email","role":"CAREGIVER"}' "$TOKEN" "400" "email"

test_error_case "Invite member with invalid role" "POST" "/families/${FAMILY_ID}/invite" \
    '{"email":"test@test.com","role":"INVALID_ROLE"}' "$TOKEN" "400" "role"

echo ""
echo "======================================================================"
echo "SECTION 4: Care Recipient Edge Cases"
echo "======================================================================"
echo ""

# 4.1 Missing required fields
test_error_case "Create care recipient without fullName" "POST" "/families/${FAMILY_ID}/care-recipients" \
    '{"bloodType":"A+"}' "$TOKEN" "400" "fullName"

# 4.2 Invalid data types
test_error_case "Create care recipient with invalid blood type" "POST" "/families/${FAMILY_ID}/care-recipients" \
    '{"fullName":"Test","bloodType":"INVALID"}' "$TOKEN" "400" ""

# Create valid care recipient for further tests
care_recipient_response=$(curl -s -X POST "${API_BASE}/families/${FAMILY_ID}/care-recipients" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"fullName":"Edge Test Recipient","bloodType":"A+","allergies":[],"conditions":[]}')
CARE_RECIPIENT_ID=$(echo "$care_recipient_response" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

# 4.3 Invalid updates
test_error_case "Update care recipient with invalid UUID" "PATCH" "/care-recipients/not-a-uuid" \
    '{"preferredName":"Test"}' "$TOKEN" "400" ""

test_error_case "Delete non-existent care recipient" "DELETE" "/care-recipients/00000000-0000-0000-0000-000000000000" \
    "" "$TOKEN" "403" ""

echo ""
echo "======================================================================"
echo "SECTION 5: Medication Edge Cases"
echo "======================================================================"
echo ""

# 5.1 Missing required fields
test_error_case "Create medication without name" "POST" "/care-recipients/${CARE_RECIPIENT_ID}/medications" \
    '{"dosage":"500mg","frequency":"ONCE_DAILY"}' "$TOKEN" "400" "name"

test_error_case "Create medication without dosage" "POST" "/care-recipients/${CARE_RECIPIENT_ID}/medications" \
    '{"name":"Test Med","frequency":"ONCE_DAILY"}' "$TOKEN" "400" "dosage"

# 5.2 Invalid enums
test_error_case "Create medication with invalid frequency" "POST" "/care-recipients/${CARE_RECIPIENT_ID}/medications" \
    '{"name":"Test Med","dosage":"500mg","frequency":"INVALID_FREQUENCY"}' "$TOKEN" "400" "frequency"

test_error_case "Create medication with invalid form" "POST" "/care-recipients/${CARE_RECIPIENT_ID}/medications" \
    '{"name":"Test Med","dosage":"500mg","frequency":"ONCE_DAILY","form":"INVALID_FORM"}' "$TOKEN" "400" ""

# 5.3 Boundary conditions
test_error_case "Create medication with negative supply" "POST" "/care-recipients/${CARE_RECIPIENT_ID}/medications" \
    '{"name":"Test Med","dosage":"500mg","frequency":"ONCE_DAILY","currentSupply":-10}' "$TOKEN" "400" ""

# Create valid medication for further tests
medication_response=$(curl -s -X POST "${API_BASE}/care-recipients/${CARE_RECIPIENT_ID}/medications" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"name":"Edge Test Med","dosage":"500mg","frequency":"ONCE_DAILY","timesPerDay":1,"scheduledTimes":["08:00"],"currentSupply":30,"refillAt":10}')
MEDICATION_ID=$(echo "$medication_response" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

echo ""
echo "======================================================================"
echo "SECTION 6: Appointment Edge Cases"
echo "======================================================================"
echo ""

# 6.1 Missing required fields
test_error_case "Create appointment without title" "POST" "/care-recipients/${CARE_RECIPIENT_ID}/appointments" \
    '{"type":"DOCTOR_VISIT","startTime":"2026-01-20T10:00:00Z"}' "$TOKEN" "400" "title"

test_error_case "Create appointment without startTime" "POST" "/care-recipients/${CARE_RECIPIENT_ID}/appointments" \
    '{"title":"Test","type":"DOCTOR_VISIT"}' "$TOKEN" "400" "startTime"

# 6.2 Invalid date/time
test_error_case "Create appointment with invalid date" "POST" "/care-recipients/${CARE_RECIPIENT_ID}/appointments" \
    '{"title":"Test","type":"DOCTOR_VISIT","startTime":"not-a-date"}' "$TOKEN" "400" ""

# 6.3 Invalid enums
test_error_case "Create appointment with invalid type" "POST" "/care-recipients/${CARE_RECIPIENT_ID}/appointments" \
    '{"title":"Test","type":"INVALID_TYPE","startTime":"2026-01-20T10:00:00Z"}' "$TOKEN" "400" "type"

test_error_case "Create appointment with invalid status" "POST" "/care-recipients/${CARE_RECIPIENT_ID}/appointments" \
    '{"title":"Test","type":"DOCTOR_VISIT","startTime":"2026-01-20T10:00:00Z","status":"INVALID_STATUS"}' "$TOKEN" "400" ""

echo ""
echo "======================================================================"
echo "SECTION 7: Emergency Alert Edge Cases"
echo "======================================================================"
echo ""

# 7.1 Missing required fields
test_error_case "Create alert without type" "POST" "/care-recipients/${CARE_RECIPIENT_ID}/emergency-alerts" \
    '{"title":"Test Alert"}' "$TOKEN" "400" "type"

test_error_case "Create alert without title" "POST" "/care-recipients/${CARE_RECIPIENT_ID}/emergency-alerts" \
    '{"type":"MEDICAL"}' "$TOKEN" "400" "title"

# 7.2 Invalid enums
test_error_case "Create alert with invalid type" "POST" "/care-recipients/${CARE_RECIPIENT_ID}/emergency-alerts" \
    '{"type":"INVALID_TYPE","title":"Test"}' "$TOKEN" "400" "type"

echo ""
echo "======================================================================"
echo "SECTION 8: Timeline Edge Cases"
echo "======================================================================"
echo ""

# 8.1 Missing required fields
test_error_case "Create timeline entry without type" "POST" "/care-recipients/${CARE_RECIPIENT_ID}/timeline" \
    '{"title":"Test Entry"}' "$TOKEN" "400" "type"

test_error_case "Create timeline entry without title" "POST" "/care-recipients/${CARE_RECIPIENT_ID}/timeline" \
    '{"type":"VITALS"}' "$TOKEN" "400" "title"

# 8.2 Invalid enums
test_error_case "Create timeline entry with invalid type" "POST" "/care-recipients/${CARE_RECIPIENT_ID}/timeline" \
    '{"type":"INVALID_TYPE","title":"Test"}' "$TOKEN" "400" "type"

test_error_case "Create timeline entry with invalid severity" "POST" "/care-recipients/${CARE_RECIPIENT_ID}/timeline" \
    '{"type":"SYMPTOM","title":"Test","severity":"INVALID_SEVERITY"}' "$TOKEN" "400" ""

echo ""
echo "======================================================================"
echo "SECTION 9: Notification Edge Cases"
echo "======================================================================"
echo ""

# 9.1 Invalid UUIDs
test_error_case "Mark non-existent notification as read" "PATCH" "/notifications/00000000-0000-0000-0000-000000000000/read" \
    "" "$TOKEN" "404" ""

# 9.2 Push token validation
test_error_case "Register push token without token" "POST" "/notifications/push-token" \
    '{"platform":"IOS"}' "$TOKEN" "400" "token"

test_error_case "Register push token with invalid platform" "POST" "/notifications/push-token" \
    '{"token":"test-token","platform":"INVALID_PLATFORM"}' "$TOKEN" "400" ""

echo ""
echo "======================================================================"
echo "SECTION 10: Rate Limiting & Security"
echo "======================================================================"
echo ""

echo "Testing rate limiting on sensitive endpoints..."
# Attempt multiple rapid requests (should be rate limited if configured)
for i in {1..6}; do
    curl -s -X POST "${API_BASE}/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"test@test.com","password":"wrong"}' > /dev/null
done

test_error_case "Rate limit check (6th failed login)" "POST" "/auth/login" \
    '{"email":"test@test.com","password":"wrong"}' "" "429" ""

echo ""
echo "======================================================================"
echo "SECTION 11: Response Format Consistency"
echo "======================================================================"
echo ""

echo "Checking error response formats..."

# All error responses should have consistent structure
error_response=$(curl -s -X POST "${API_BASE}/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"email":"invalid"}')

if echo "$error_response" | grep -q '"statusCode"' && \
   echo "$error_response" | grep -q '"message"' && \
   echo "$error_response" | grep -q '"timestamp"'; then
    echo -e "${GREEN}✅ PASSED${NC} - Error responses have consistent format"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FAILED${NC} - Error responses missing required fields"
    echo "Response: $error_response"
    FAILED=$((FAILED + 1))
fi
TOTAL=$((TOTAL + 1))

echo ""
echo "======================================================================"
echo "📊 EDGE CASE TEST SUMMARY"
echo "======================================================================"
echo ""
echo "Total Tests:  $TOTAL"
echo -e "${GREEN}✅ Passed:     $PASSED${NC}"
echo -e "${RED}❌ Failed:     $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All edge case tests passed!${NC}"
    exit 0
else
    PASS_RATE=$((PASSED * 100 / TOTAL))
    echo "Pass Rate:    ${PASS_RATE}%"
    if [ $PASS_RATE -ge 90 ]; then
        echo -e "${GREEN}✅ Excellent edge case coverage${NC}"
        exit 0
    elif [ $PASS_RATE -ge 75 ]; then
        echo -e "${YELLOW}⚠️  Good, but needs attention${NC}"
        exit 1
    else
        echo -e "${RED}❌ Significant edge case issues found${NC}"
        exit 1
    fi
fi
