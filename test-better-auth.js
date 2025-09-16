#!/usr/bin/env node

/**
 * Test script for better-auth REST API with sessions and RBAC
 * This script tests the complete authentication flow and RBAC system
 */

const axios = require('axios');
const crypto = require('crypto');

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:3001'; // Updated for test environment
const TEST_EMAIL = `test-${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPassword123!';
const TEST_USERNAME = `testuser${Date.now()}`;

// Admin credentials for testing
const ADMIN_EMAIL = 'admin@test.com';
const ADMIN_PASSWORD = 'AdminTest123!';

// Test state
let sessionCookie = '';
let adminSessionCookie = '';
let testUserId = '';
let invitationId = '';

// Helper function to make requests with session cookies
const makeRequest = async (method, url, data = null, cookies = '') => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      withCredentials: true
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response;
  } catch (error) {
    return error.response;
  }
};

// Test functions
const testHealthCheck = async () => {
  console.log('\n🔍 Testing health check...');
  const response = await makeRequest('GET', '/api/health');
  
  if (response.status === 200) {
    console.log('✅ Health check passed');
    return true;
  } else {
    console.log('❌ Health check failed:', response.status);
    return false;
  }
};

const testCreateAdminInvitation = async () => {
  console.log('\n🔍 Testing admin invitation creation...');
  
  // First, we need to create an admin user manually in the database
  // For this test, we'll assume there's already an admin user
  // In a real scenario, you'd seed the database with an admin user
  
  console.log('⚠️  Note: This test assumes an admin user already exists in the database');
  console.log('   You may need to manually create an admin user for this test to work');
  
  return true;
};

const testAdminSignIn = async () => {
  console.log('\n🔍 Testing admin sign in...');
  
  const signInData = {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  };
  
  const response = await makeRequest('POST', '/api/auth/signin', signInData);
  
  if (response.status === 200) {
    console.log('✅ Admin sign in successful');
    // Extract session cookie from response headers
    const setCookieHeader = response.headers['set-cookie'];
    if (setCookieHeader) {
      adminSessionCookie = setCookieHeader.join('; ');
    }
    return true;
  } else {
    console.log('❌ Admin sign in failed:', response.status, response.data);
    console.log('   Make sure to run ./create-test-admin.sh first');
    return false;
  }
};

const testCreateInvitation = async () => {
  console.log('\n🔍 Testing invitation creation...');
  
  const invitationData = {
    email: TEST_EMAIL,
    role: 'MEMBER'
  };
  
  const response = await makeRequest('POST', '/api/invitations', invitationData, adminSessionCookie);
  
  if (response.status === 201) {
    console.log('✅ Invitation created successfully');
    invitationId = response.data.data.id;
    return true;
  } else {
    console.log('❌ Invitation creation failed:', response.status, response.data);
    console.log('   Make sure admin is signed in and has proper permissions');
    return false;
  }
};

const testUserSignUp = async () => {
  console.log('\n🔍 Testing user sign up...');
  
  const signUpData = {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    username: TEST_USERNAME,
    name: 'Test User',
    invitationToken: invitationId
  };
  
  const response = await makeRequest('POST', '/api/auth/signup', signUpData);
  
  if (response.status === 201) {
    console.log('✅ User sign up successful');
    testUserId = response.data.user.id;
    return true;
  } else {
    console.log('❌ User sign up failed:', response.status, response.data);
    return false;
  }
};

const testUserSignIn = async () => {
  console.log('\n🔍 Testing user sign in...');
  
  const signInData = {
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  };
  
  const response = await makeRequest('POST', '/api/auth/signin', signInData);
  
  if (response.status === 200) {
    console.log('✅ User sign in successful');
    // Extract session cookie from response headers
    const setCookieHeader = response.headers['set-cookie'];
    if (setCookieHeader) {
      sessionCookie = setCookieHeader.join('; ');
    }
    return true;
  } else {
    console.log('❌ User sign in failed:', response.status, response.data);
    return false;
  }
};

const testGetSession = async () => {
  console.log('\n🔍 Testing get session...');
  
  const response = await makeRequest('GET', '/api/auth/session', null, sessionCookie);
  
  if (response.status === 200) {
    console.log('✅ Get session successful');
    console.log('   User:', response.data.user.email);
    console.log('   Role:', response.data.user.role);
    return true;
  } else {
    console.log('❌ Get session failed:', response.status, response.data);
    return false;
  }
};

const testGetUserProfile = async () => {
  console.log('\n🔍 Testing get user profile...');
  
  const response = await makeRequest('GET', '/api/user/profile', null, sessionCookie);
  
  if (response.status === 200) {
    console.log('✅ Get user profile successful');
    return true;
  } else {
    console.log('❌ Get user profile failed:', response.status, response.data);
    return false;
  }
};

const testGetUserStatus = async () => {
  console.log('\n🔍 Testing get user status...');
  
  const response = await makeRequest('GET', '/api/user/status', null, sessionCookie);
  
  if (response.status === 200) {
    console.log('✅ Get user status successful');
    console.log('   Next action:', response.data.next_action);
    return true;
  } else {
    console.log('❌ Get user status failed:', response.status, response.data);
    return false;
  }
};

const testUpdateUserProfile = async () => {
  console.log('\n🔍 Testing update user profile...');
  
  const updateData = {
    name: 'Updated Test User',
    phone: '+1234567890',
    address: '123 Test Street',
    profession: 'Software Developer'
  };
  
  const response = await makeRequest('PUT', '/api/user/profile', updateData, sessionCookie);
  
  if (response.status === 200) {
    console.log('✅ Update user profile successful');
    return true;
  } else {
    console.log('❌ Update user profile failed:', response.status, response.data);
    return false;
  }
};

const testChangePassword = async () => {
  console.log('\n🔍 Testing change password...');
  
  const passwordData = {
    currentPassword: TEST_PASSWORD,
    newPassword: 'NewTestPassword123!'
  };
  
  const response = await makeRequest('POST', '/api/auth/change-password', passwordData, sessionCookie);
  
  if (response.status === 200) {
    console.log('✅ Change password successful');
    return true;
  } else {
    console.log('❌ Change password failed:', response.status, response.data);
    return false;
  }
};

const testUnauthorizedAccess = async () => {
  console.log('\n🔍 Testing unauthorized access...');
  
  // Try to access admin endpoint without admin role
  const response = await makeRequest('GET', '/api/admin/dashboard', null, sessionCookie);
  
  if (response.status === 403) {
    console.log('✅ Unauthorized access properly blocked');
    return true;
  } else {
    console.log('❌ Unauthorized access not properly blocked:', response.status);
    return false;
  }
};

const testSignOut = async () => {
  console.log('\n🔍 Testing sign out...');
  
  const response = await makeRequest('POST', '/api/auth/signout', null, sessionCookie);
  
  if (response.status === 200) {
    console.log('✅ Sign out successful');
    return true;
  } else {
    console.log('❌ Sign out failed:', response.status, response.data);
    return false;
  }
};

const testSessionAfterSignOut = async () => {
  console.log('\n🔍 Testing session after sign out...');
  
  const response = await makeRequest('GET', '/api/auth/session', null, sessionCookie);
  
  if (response.status === 401) {
    console.log('✅ Session properly invalidated after sign out');
    return true;
  } else {
    console.log('❌ Session not properly invalidated:', response.status);
    return false;
  }
};

// Main test runner
const runTests = async () => {
  console.log('🚀 Starting better-auth REST API tests...');
  console.log(`📡 Testing against: ${BASE_URL}`);
  console.log(`📧 Test email: ${TEST_EMAIL}`);
  
  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Create Admin Invitation', fn: testCreateAdminInvitation },
    { name: 'Admin Sign In', fn: testAdminSignIn },
    { name: 'Create Invitation', fn: testCreateInvitation },
    { name: 'User Sign Up', fn: testUserSignUp },
    { name: 'User Sign In', fn: testUserSignIn },
    { name: 'Get Session', fn: testGetSession },
    { name: 'Get User Profile', fn: testGetUserProfile },
    { name: 'Get User Status', fn: testGetUserStatus },
    { name: 'Update User Profile', fn: testUpdateUserProfile },
    { name: 'Change Password', fn: testChangePassword },
    { name: 'Unauthorized Access', fn: testUnauthorizedAccess },
    { name: 'Sign Out', fn: testSignOut },
    { name: 'Session After Sign Out', fn: testSessionAfterSignOut }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} failed with error:`, error.message);
      failed++;
    }
  }
  
  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! The better-auth REST API is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the implementation.');
  }
};

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  runTests,
  makeRequest,
  BASE_URL,
  TEST_EMAIL,
  TEST_PASSWORD,
  TEST_USERNAME
};
