#!/bin/bash
# CareCircle Comprehensive Feature Test Suite
# Tests every API endpoint end-to-end

API_BASE="http://localhost:4000/api/v1"
TIMESTAMP=$(date +%s)
TEST_USER_EMAIL="testuser${TIMESTAMP}@carecircle.test"
TEST_USER_PWD="TestPass123!"

echo "======================================================================"
echo "🧪 CareCircle Comprehensive API Test Suite"
echo "======================================================================"
echo ""

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

test_endpoint() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local auth_header="$5"

    echo -n "Test ${TOTAL_TESTS}: ${name}... "

    if [ -z "$auth_header" ]; then
        response=$(curl -X "$method" "${API_BASE}${endpoint}" \
            -H "Content-Type: application/json" \
            -d "$data" \
            --silent --write-out "\nHTTP_STATUS:%{http_code}")
    else
        response=$(curl -X "$method" "${API_BASE}${endpoint}" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $auth_header" \
            -d "$data" \
            --silent --write-out "\nHTTP_STATUS:%{http_code}")
    fi

    http_code=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
    body=$(echo "$response" | grep -v "HTTP_STATUS:")

    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo "✅ PASSED (HTTP $http_code)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo "$body" | head -1
        return 0
    else
        echo "❌ FAILED (HTTP $http_code)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo "$body" | head -2
        return 1
    fi
}

echo "======================================================================"
echo "MODULE 1: Authentication & Authorization"
echo "======================================================================"
echo ""

# 1.1 Register
test_endpoint "Register User" "POST" "/auth/register" \
    "{\"fullName\":\"Test User\",\"email\":\"${TEST_USER_EMAIL}\",\"password\":\"${TEST_USER_PWD}\"}"

# 1.2 Login & get token
echo -n "Test $((TOTAL_TESTS + 1)): Login User... "
login_response=$(curl -X POST "${API_BASE}/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${TEST_USER_EMAIL}\",\"password\":\"${TEST_USER_PWD}\"}" \
    --silent)

TOKEN=$(echo "$login_response" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
REFRESH_TOKEN=$(echo "$login_response" | grep -o '"refreshToken":"[^"]*' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    echo "✅ PASSED"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo "Token: ${TOKEN:0:40}..."
else
    echo "❌ FAILED - No token received"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    FAILED_TESTS=$((FAILED_TESTS + 1))
    exit 1
fi
echo ""

# 1.3 Get Profile
test_endpoint "Get User Profile" "GET" "/auth/me" "" "$TOKEN"
echo ""

# 1.4 Get Sessions
test_endpoint "Get Active Sessions" "GET" "/auth/sessions" "" "$TOKEN"
echo ""

echo "======================================================================"
echo "MODULE 2: Family Management"
echo "======================================================================"
echo ""

# 2.1 Create Family
echo -n "Test $((TOTAL_TESTS + 1)): Create Family... "
family_response=$(curl -X POST "${API_BASE}/families" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"name":"Thompson Family"}' \
    --silent --write-out "\nHTTP_STATUS:%{http_code}")

http_code=$(echo "$family_response" | grep "HTTP_STATUS:" | cut -d: -f2)
FAMILY_ID=$(echo "$family_response" | grep -v "HTTP_STATUS:" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -n "$FAMILY_ID" ] && [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo "✅ PASSED (HTTP $http_code)"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo "Family ID: $FAMILY_ID"
else
    echo "❌ FAILED (HTTP $http_code)"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""

# 2.2 List Families
test_endpoint "List My Families" "GET" "/families" "" "$TOKEN"
echo ""

# 2.3 Get Family Details
test_endpoint "Get Family Details" "GET" "/families/${FAMILY_ID}" "" "$TOKEN"
echo ""

echo "======================================================================"
echo "MODULE 3: Care Recipients"
echo "======================================================================"
echo ""

# 3.1 Create Care Recipient
echo -n "Test $((TOTAL_TESTS + 1)): Create Care Recipient... "
cr_response=$(curl -X POST "${API_BASE}/families/${FAMILY_ID}/care-recipients" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"fullName":"Grandma Margaret","preferredName":"Maggie","bloodType":"A+","allergies":["Penicillin"],"conditions":["Diabetes"]}' \
    --silent --write-out "\nHTTP_STATUS:%{http_code}")

http_code=$(echo "$cr_response" | grep "HTTP_STATUS:" | cut -d: -f2)
CARE_RECIPIENT_ID=$(echo "$cr_response" | grep -v "HTTP_STATUS:" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -n "$CARE_RECIPIENT_ID" ] && [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo "✅ PASSED (HTTP $http_code)"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo "Care Recipient ID: $CARE_RECIPIENT_ID"
else
    echo "❌ FAILED (HTTP $http_code)"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""

# 3.2 List Care Recipients
test_endpoint "List Care Recipients" "GET" "/families/${FAMILY_ID}/care-recipients" "" "$TOKEN"
echo ""

# 3.3 Get Care Recipient
test_endpoint "Get Care Recipient Details" "GET" "/care-recipients/${CARE_RECIPIENT_ID}" "" "$TOKEN"
echo ""

# 3.4 Add Doctor
test_endpoint "Add Doctor" "POST" "/care-recipients/${CARE_RECIPIENT_ID}/doctors" \
    '{"name":"Dr. Sarah Johnson","specialty":"Endocrinology","phone":"555-0123","email":"dr.johnson@example.com"}' "$TOKEN"
echo ""

# 3.5 List Doctors
test_endpoint "List Doctors" "GET" "/care-recipients/${CARE_RECIPIENT_ID}/doctors" "" "$TOKEN"
echo ""

# 3.6 Add Emergency Contact
test_endpoint "Add Emergency Contact" "POST" "/care-recipients/${CARE_RECIPIENT_ID}/emergency-contacts" \
    '{"name":"John Thompson","relationship":"Son","phone":"555-9999","email":"john@example.com","isPrimary":true}' "$TOKEN"
echo ""

# 3.7 List Emergency Contacts
test_endpoint "List Emergency Contacts" "GET" "/care-recipients/${CARE_RECIPIENT_ID}/emergency-contacts" "" "$TOKEN"
echo ""

echo "======================================================================"
echo "MODULE 4: Medications"
echo "======================================================================"
echo ""

# 4.1 Create Medication
echo -n "Test $((TOTAL_TESTS + 1)): Create Medication... "
med_response=$(curl -X POST "${API_BASE}/care-recipients/${CARE_RECIPIENT_ID}/medications" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"name":"Metformin","dosage":"500mg","form":"TABLET","frequency":"TWICE_DAILY","timesPerDay":2,"scheduledTimes":["08:00","20:00"],"instructions":"Take with food","currentSupply":60,"refillAt":10}' \
    --silent --write-out "\nHTTP_STATUS:%{http_code}")

http_code=$(echo "$med_response" | grep "HTTP_STATUS:" | cut -d: -f2)
MEDICATION_ID=$(echo "$med_response" | grep -v "HTTP_STATUS:" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -n "$MEDICATION_ID" ] && [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo "✅ PASSED (HTTP $http_code)"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo "Medication ID: $MEDICATION_ID"
else
    echo "❌ FAILED (HTTP $http_code)"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""

# 4.2 List Medications
test_endpoint "List Medications" "GET" "/care-recipients/${CARE_RECIPIENT_ID}/medications" "" "$TOKEN"
echo ""

# 4.3 Get Today's Schedule
test_endpoint "Get Today's Med Schedule" "GET" "/care-recipients/${CARE_RECIPIENT_ID}/medications/schedule/today" "" "$TOKEN"
echo ""

echo "======================================================================"
echo "MODULE 5: Appointments"
echo "======================================================================"
echo ""

# 5.1 Create Appointment
tomorrow=$(date -d "tomorrow" +%Y-%m-%dT10:00:00Z 2>/dev/null || date -v+1d +%Y-%m-%dT10:00:00Z 2>/dev/null || echo "2026-01-18T10:00:00Z")
end_time=$(date -d "tomorrow 11:00" +%Y-%m-%dT11:00:00Z 2>/dev/null || date -v+1d +%Y-%m-%dT11:00:00Z 2>/dev/null || echo "2026-01-18T11:00:00Z")

test_endpoint "Create Appointment" "POST" "/care-recipients/${CARE_RECIPIENT_ID}/appointments" \
    "{\"title\":\"Diabetes Checkup\",\"type\":\"DOCTOR_VISIT\",\"startTime\":\"${tomorrow}\",\"endTime\":\"${end_time}\",\"location\":\"Medical Center\"}" "$TOKEN"
echo ""

# 5.2 List Appointments
test_endpoint "List Appointments" "GET" "/care-recipients/${CARE_RECIPIENT_ID}/appointments" "" "$TOKEN"
echo ""

echo "======================================================================"
echo "MODULE 6: Emergency Alerts"
echo "======================================================================"
echo ""

# 6.1 Get Emergency Info
test_endpoint "Get Emergency Info" "GET" "/care-recipients/${CARE_RECIPIENT_ID}/emergency/info" "" "$TOKEN"
echo ""

# 6.2 Create Emergency Alert
test_endpoint "Create Emergency Alert" "POST" "/care-recipients/${CARE_RECIPIENT_ID}/emergency/alerts" \
    '{"type":"MEDICAL","title":"Blood Sugar Spike","description":"Blood sugar reading 380 mg/dL","location":"Home"}' "$TOKEN"
echo ""

# 6.3 List Emergency Alerts
test_endpoint "List Emergency Alerts" "GET" "/care-recipients/${CARE_RECIPIENT_ID}/emergency/alerts" "" "$TOKEN"
echo ""

echo "======================================================================"
echo "MODULE 7: Timeline"
echo "======================================================================"
echo ""

# 7.1 Create Timeline Entry
test_endpoint "Create Timeline Entry" "POST" "/care-recipients/${CARE_RECIPIENT_ID}/timeline" \
    '{"type":"NOTE","title":"Daily Update","description":"Feeling good today, ate well"}' "$TOKEN"
echo ""

# 7.2 List Timeline
test_endpoint "List Timeline Entries" "GET" "/care-recipients/${CARE_RECIPIENT_ID}/timeline" "" "$TOKEN"
echo ""

echo "======================================================================"
echo "MODULE 8: Notifications"
echo "======================================================================"
echo ""

# 8.1 List Notifications
test_endpoint "List Notifications" "GET" "/notifications" "" "$TOKEN"
echo ""

# 8.2 Get Unread Count
test_endpoint "Get Unread Count" "GET" "/notifications/unread/count" "" "$TOKEN"
echo ""

echo "======================================================================"
echo "MODULE 9: Chat"
echo "======================================================================"
echo ""

# 9.1 Get Chat Token
test_endpoint "Get Chat Token" "GET" "/chat/token" "" "$TOKEN"
echo ""

# 9.2 Create Family Channel
test_endpoint "Create Family Channel" "POST" "/chat/family/${FAMILY_ID}/channel" \
    '{"familyName":"Thompson Family","memberIds":[]}' "$TOKEN"
echo ""

echo ""
echo "======================================================================"
echo "📊 TEST SUMMARY"
echo "======================================================================"
echo ""
echo "Total Tests:  $TOTAL_TESTS"
echo "✅ Passed:     $PASSED_TESTS"
echo "❌ Failed:     $FAILED_TESTS"
echo ""
if [ $FAILED_TESTS -eq 0 ]; then
    echo "🎉 ALL TESTS PASSED! CareCircle API is fully functional!"
else
    echo "⚠️  Some tests failed. Review the output above for details."
fi
echo "======================================================================"
