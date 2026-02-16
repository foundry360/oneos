# SDK Review Status Handling Update

## Overview

The SDK has been updated to provide better handling for prompts that require human review. Instead of throwing an error, the SDK now returns a structured response that allows customers to:

1. **Show users that their prompt is under review**
2. **Poll for status updates automatically or manually**
3. **Wait for approval and automatically receive the response when approved**

## What Changed

### Before (Old Behavior)

```javascript
try {
  const response = await governLLM.complete({ prompt: '...', userId: 'user123' });
  console.log(response.text);
} catch (error) {
  if (error.status === 'pending_review') {
    // Had to manually extract requestId and poll
    console.log('Review required:', error.requestId);
  }
}
```

### After (New Behavior)

```javascript
const response = await governLLM.complete({ prompt: '...', userId: 'user123' });

if (response.status === 'pending_review') {
  // Show "Under Review" message to user
  showUserMessage('Your prompt is under review...');
  
  // Automatically wait for approval
  const finalResponse = await response.waitForApproval();
  console.log(finalResponse.text);
} else {
  // Auto-approved
  console.log(response.text);
}
```

## New Response Structure

### When Review is Required

```javascript
{
  status: "pending_review",
  requestId: "uuid-here",
  message: "Prompt submitted for human review",
  riskLevel: "high",
  riskScore: 0.85,
  checkStatus: Function,      // Helper method to check status
  waitForApproval: Function   // Helper method to wait for approval
}
```

### When Auto-Approved

```javascript
{
  status: "completed",
  text: "LLM response text...",
  requestId: "uuid-here",
  metadata: { ... }
}
```

## New Methods

### `checkStatus(requestId)`

Manually check the status of a prompt request:

```javascript
const status = await governLLM.checkStatus('request-id-here');
console.log(status.status);        // 'pending_review', 'completed', 'rejected'
console.log(status.responseText);  // Available when completed
```

### `waitForApproval(requestId, options)`

Automatically poll until the prompt is approved or rejected:

```javascript
const response = await governLLM.complete({ ... });

if (response.status === 'pending_review') {
  const finalResponse = await response.waitForApproval({
    interval: 2000,        // Poll every 2 seconds (default)
    timeout: 300000,        // Wait up to 5 minutes (default)
    onStatusChange: (status) => {
      // Called on each status check
      updateUI(status);
    }
  });
  
  console.log(finalResponse.text);
}
```

## Migration Guide

### Step 1: Update Error Handling

**Old code:**
```javascript
try {
  const response = await governLLM.complete({ ... });
} catch (error) {
  if (error.status === 'pending_review') {
    // Handle review
  }
}
```

**New code:**
```javascript
const response = await governLLM.complete({ ... });

if (response.status === 'pending_review') {
  // Handle review
} else {
  // Auto-approved
}
```

### Step 2: Add Status Polling

**Option A: Automatic (Recommended)**
```javascript
if (response.status === 'pending_review') {
  const finalResponse = await response.waitForApproval();
  // Use finalResponse.text
}
```

**Option B: Manual**
```javascript
if (response.status === 'pending_review') {
  const status = await governLLM.checkStatus(response.requestId);
  // Check status.status and update UI
}
```

### Step 3: Update UI

Show users that their prompt is under review:

```javascript
if (response.status === 'pending_review') {
  // Show "Under Review" message
  showUserMessage('Your prompt is under review. Please wait...');
  
  // Wait for approval
  const finalResponse = await response.waitForApproval({
    onStatusChange: (status) => {
      // Update UI with current status
      updateStatusIndicator(status.status);
    }
  });
  
  // Show response when approved
  showUserMessage('Response received!');
  displayResponse(finalResponse.text);
}
```

## Complete Example

```javascript
const { governLLM } = require('./govern-llm.js');

async function handlePrompt(promptText, userId) {
  try {
    const response = await governLLM.complete({
      prompt: promptText,
      userId: userId,
      model: 'gpt-4',
      provider: 'openai'
    });

    if (response.status === 'pending_review') {
      // Show review status to user
      console.log('⏳ Your prompt is under review');
      console.log('   Risk Level:', response.riskLevel);
      console.log('   Request ID:', response.requestId);
      
      // Wait for approval
      try {
        const finalResponse = await response.waitForApproval({
          interval: 2000,
          timeout: 300000,
          onStatusChange: (status) => {
            console.log('   Status:', status.status);
          }
        });
        
        // Prompt approved and processed
        console.log('✅ Response received:', finalResponse.text);
        return finalResponse.text;
      } catch (error) {
        if (error.status === 'rejected') {
          console.error('❌ Prompt rejected:', error.message);
          throw error;
        } else {
          console.error('⏱️ Timeout:', error.message);
          throw error;
        }
      }
    } else {
      // Auto-approved
      console.log('✅ Auto-approved response:', response.text);
      return response.text;
    }
  } catch (error) {
    if (error.status === 'rejected') {
      console.error('❌ Prompt rejected:', error.message);
    } else {
      console.error('❌ Error:', error.message);
    }
    throw error;
  }
}
```

## Benefits

1. **Better UX**: Users see "Under Review" instead of an error
2. **Automatic Polling**: No need to manually implement polling logic
3. **Status Updates**: Optional callback for real-time UI updates
4. **Error Handling**: Clear distinction between rejected prompts and other errors
5. **Backward Compatible**: Old error-based code still works (but deprecated)

## Backward Compatibility

The old error-based approach still works, but is deprecated:

```javascript
// Still works, but not recommended
try {
  const response = await governLLM.complete({ ... });
} catch (error) {
  if (error.status === 'pending_review') {
    // Old way - still works
  }
}
```

**Recommendation**: Migrate to the new response-based approach for better UX.

## Questions?

- See `examples/sdk_review_handling.js` for complete examples
- See `docs/CUSTOMER_INSTALLATION_GUIDE.md` for full documentation
- Contact support if you need help migrating


