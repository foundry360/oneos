/**
 * Example: Handling Prompts That Require Review
 * 
 * This example shows how to handle prompts that require human review
 * and how to poll for status updates.
 */

const { governLLM } = require('../sdk/govern-llm.js');

// Example 1: Basic review handling with automatic polling
async function example1_BasicReviewHandling() {
  try {
    const response = await governLLM.complete({
      prompt: 'Analyze this sensitive financial transaction data...',
      userId: 'employee-123',
      userEmail: 'employee@company.com',
      model: 'gpt-4',
      provider: 'openai'
    });

    if (response.status === 'pending_review') {
      console.log('⏳ Prompt submitted for review');
      console.log('   Request ID:', response.requestId);
      console.log('   Risk Level:', response.riskLevel);
      console.log('   Risk Score:', response.riskScore);
      
      // Show "Under Review" message to user
      showUserMessage('Your prompt is under review. Please wait...');
      
      // Wait for approval automatically
      try {
        const finalResponse = await response.waitForApproval({
          interval: 2000,      // Check every 2 seconds
          timeout: 300000,      // Wait up to 5 minutes
          onStatusChange: (status) => {
            console.log('   Status update:', status.status);
            // Update UI with current status
            updateUIStatus(status.status);
          }
        });
        
        // Prompt was approved and processed
        console.log('✅ Prompt approved!');
        console.log('   Response:', finalResponse.text);
        showUserMessage('Response received!');
        return finalResponse.text;
      } catch (error) {
        if (error.status === 'rejected') {
          console.error('❌ Prompt rejected:', error.message);
          showUserMessage('Your prompt was rejected: ' + error.message);
        } else {
          console.error('⏱️ Timeout waiting for approval:', error.message);
          showUserMessage('Review is taking longer than expected. Please check back later.');
        }
        throw error;
      }
    } else {
      // Auto-approved
      console.log('✅ Prompt auto-approved');
      console.log('   Response:', response.text);
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

// Example 2: Manual status polling with custom UI updates
async function example2_ManualPolling() {
  try {
    const response = await governLLM.complete({
      prompt: 'Generate a report on customer data...',
      userId: 'user-456',
      model: 'gpt-4'
    });

    if (response.status === 'pending_review') {
      console.log('Prompt requires review. Request ID:', response.requestId);
      
      // Show review status in UI
      showReviewStatus({
        requestId: response.requestId,
        status: 'pending',
        message: 'Your prompt is under review'
      });
      
      // Poll manually with custom logic
      let attempts = 0;
      const maxAttempts = 150; // 5 minutes at 2 second intervals
      
      const pollInterval = setInterval(async () => {
        attempts++;
        
        try {
          const status = await governLLM.checkStatus(response.requestId);
          
          // Update UI with current status
          showReviewStatus({
            requestId: status.requestId,
            status: status.status,
            message: status.message,
            updatedAt: status.updatedAt
          });
          
          if (status.status === 'completed' || status.status === 'approved') {
            clearInterval(pollInterval);
            console.log('✅ Prompt approved!');
            console.log('   Response:', status.responseText);
            showUserMessage('Response received: ' + status.responseText);
          } else if (status.status === 'rejected') {
            clearInterval(pollInterval);
            console.error('❌ Prompt rejected');
            showUserMessage('Your prompt was rejected.');
          } else if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            console.warn('⏱️ Polling timeout');
            showUserMessage('Review is taking longer than expected. Please check back later.');
          }
        } catch (error) {
          clearInterval(pollInterval);
          console.error('Error checking status:', error.message);
          showUserMessage('Error checking status. Please try again.');
        }
      }, 2000); // Poll every 2 seconds
      
      // Return a promise that resolves when polling completes
      return new Promise((resolve, reject) => {
        // This would be handled by the interval callbacks above
        // In a real implementation, you'd track the promise state
      });
    } else {
      // Auto-approved
      return response.text;
    }
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

// Example 3: React/UI component integration
async function example3_ReactIntegration() {
  // This is a conceptual example for React
  const [status, setStatus] = useState('idle');
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (prompt) => {
    try {
      setStatus('submitting');
      
      const result = await governLLM.complete({
        prompt: prompt,
        userId: currentUser.id,
        model: 'gpt-4'
      });

      if (result.status === 'pending_review') {
        setStatus('reviewing');
        setResponse({ requestId: result.requestId, riskLevel: result.riskLevel });
        
        // Wait for approval
        try {
          const finalResponse = await result.waitForApproval({
            interval: 2000,
            timeout: 300000,
            onStatusChange: (status) => {
              // Update UI on each status check
              setResponse(prev => ({ ...prev, currentStatus: status.status }));
            }
          });
          
          setStatus('completed');
          setResponse({ text: finalResponse.text, metadata: finalResponse.metadata });
        } catch (error) {
          if (error.status === 'rejected') {
            setStatus('rejected');
            setError(error.message);
          } else {
            setStatus('timeout');
            setError('Review is taking longer than expected');
          }
        }
      } else {
        setStatus('completed');
        setResponse({ text: result.text, metadata: result.metadata });
      }
    } catch (error) {
      setStatus('error');
      setError(error.message);
    }
  };

  // Render UI based on status
  return (
    <div>
      {status === 'reviewing' && (
        <div>
          <p>Your prompt is under review...</p>
          <p>Risk Level: {response?.riskLevel}</p>
          <p>Request ID: {response?.requestId}</p>
        </div>
      )}
      {status === 'completed' && (
        <div>
          <p>Response: {response?.text}</p>
        </div>
      )}
      {status === 'rejected' && (
        <div>
          <p>Error: {error}</p>
        </div>
      )}
    </div>
  );
}

// Helper functions (would be implemented in your UI framework)
function showUserMessage(message) {
  // Update UI to show message to user
  console.log('[UI]', message);
}

function updateUIStatus(status) {
  // Update UI status indicator
  console.log('[UI Status]', status);
}

function showReviewStatus(info) {
  // Show review status in UI
  console.log('[Review Status]', info);
}

// Export examples
module.exports = {
  example1_BasicReviewHandling,
  example2_ManualPolling,
  example3_ReactIntegration
};


