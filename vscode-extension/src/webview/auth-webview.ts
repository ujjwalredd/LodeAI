export function getAuthWebviewContent(): string {
	return `
	<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>LodeAI - AI-Powered Coding Assessment</title>
		<style>
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', system-ui, Roboto, Helvetica, Arial, sans-serif;
			background: #000000;
			color: #ffffff;
			padding: 20px;
			margin: 0;
			overflow-x: hidden;
		}
		.container {
			width: 100%;
			text-align: center;
		}
			.logo {
				display: flex;
				align-items: center;
				justify-content: center;
				gap: 12px;
				margin-bottom: 40px;
				position: relative;
			}
			/* logo-icon removed for minimalist branding */
			.logo-text {
				font-family: 'Cubao', 'Inter', system-ui, sans-serif;
				font-size: 24px;
				font-weight: 800;
				letter-spacing: 0.3px;
				color: #ffffff;
			}
		.hero-text {
			font-size: 20px;
			font-weight: 800;
			color: #ffffff;
			margin-bottom: 8px;
			line-height: 1.2;
		}
		subtitle {
			font-size: 14px;
			color: #ffffff;
			margin-bottom: 20px;
			line-height: 1.6;
		}
		.auth-form {
			background: rgba(255, 255, 255, 0.04);
			border: 1px solid rgba(255, 255, 255, 0.10);
			border-radius: 12px;
			padding: 16px;
			margin-bottom: 16px;
		}
			.form-title {
				font-size: 18px;
				font-weight: 700;
				color: #e5e7eb;
				margin-bottom: 6px;
			}
			.form-subtitle {
				font-size: 13px;
				color: #9ca3af;
				margin-bottom: 18px;
			}
			.input-group {
				margin-bottom: 20px;
			}
			.input-label {
				display: block;
				font-size: 14px;
				font-weight: 500;
				color: #ffffff;
				margin-bottom: 8px;
				text-align: left;
			}
			.input-field {
				width: 100%;
				padding: 12px 14px;
				background: #0f1115;
				border: 1px solid rgba(255, 255, 255, 0.12);
				border-radius: 10px;
				color: #ffffff;
				font-size: 15px;
				box-sizing: border-box;
				transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
			}
			.input-field:focus {
				outline: none;
				border-color: rgba(255, 255, 255, 0.25);
				box-shadow: none;
				background: #13161c;
			}
			.submit-button {
				width: 100%;
				background: #ffffff;
				border: none;
				border-radius: 12px;
				color: #000000;
				font-size: 15px;
				font-weight: 800;
				padding: 14px 22px;
				cursor: pointer;
				transition: none;
				box-shadow: none;
			}
			.submit-button:hover {
				box-shadow: none;
			}
			.submit-button:disabled {
				opacity: 0.6;
				cursor: not-allowed;
				transform: none;
			}
			.error-message {
				background: rgba(248, 81, 73, 0.08);
				border: 1px solid rgba(248, 81, 73, 0.3);
				border-radius: 12px;
				padding: 12px 16px;
				margin-top: 16px;
				font-size: 13px;
				color: #ffd1cc;
				display: none;
				box-shadow: none;
			}
			.error-message.show {
				display: block;
			}
			/* Removed architecture showcase for a cleaner, more minimal layout */
			/* Motion */
			@keyframes fadeSlideIn {
				0% { opacity: 0; transform: translateY(3px); }
				100% { opacity: 1; transform: translateY(0); }
			}
			.enter { animation: fadeSlideIn 150ms ease forwards; }
			/* Responsive */
			@media (max-width: 480px) {
				.container { max-width: 100%; }
				.hero-text { font-size: 26px; }
				.subtitle { font-size: 14px; }
				.auth-form { padding: 20px; border-radius: 14px; }
			}
			@media (prefers-reduced-motion: reduce) {
				* { animation: none !important; transition: none !important; }
			}
		</style>
	</head>
	<body>
		<div class="container">
			<div class="logo">
				<div class="logo-text">LodeAI</div>
			</div>
			
			<h1 class="hero-text">Welcome to LodeAI</h1>
			<p class="subtitle">AI-Powered Coding Assessment Platform</p>
			
			
			<div class="auth-form">
				<h2 class="form-title">Enter Your Email</h2>
				<p class="form-subtitle">Please enter the email address associated with your assessment</p>
				
				<form id="authForm">
					<div class="input-group">
						<label class="input-label" for="email">Email Address</label>
						<input 
							type="email" 
							id="email" 
							class="input-field" 
							placeholder="your.email@example.com"
							required
						>
					</div>
					
					<button type="submit" class="submit-button" id="submitButton">
						Start Assessment
					</button>
				</form>
				
				<div class="error-message" id="errorMessage"></div>
			</div>
		</div>

		<script>
			const vscode = acquireVsCodeApi();
			const form = document.getElementById('authForm');
			const emailInput = document.getElementById('email');
			const submitButton = document.getElementById('submitButton');
			const errorMessage = document.getElementById('errorMessage');

			form.addEventListener('submit', (e) => {
				e.preventDefault();
				const email = emailInput.value.trim();
				
				console.log('Form submitted with email:', email);
				
				if (!email) {
					showError('Please enter your email address');
					return;
				}

				console.log('Email validation result:', isValidEmail(email));
				if (!isValidEmail(email)) {
					showError('Please enter a valid email address');
					return;
				}

				submitButton.disabled = true;
				submitButton.textContent = 'Authenticating...';
				
				console.log('Sending authenticate message to extension');
				vscode.postMessage({
					type: 'authenticate',
					email: email
				});
			});

			function isValidEmail(email) {
				console.log('Validating email:', email);
				console.log('Email length:', email.length);
				console.log('Email characters:', email.split('').map(c => c.charCodeAt(0)));
				
				// Simple email validation - just check for @ and .
				const hasAt = email.includes('@');
				const hasDot = email.includes('.');
				const hasSpace = email.includes(' ');
				
				console.log('Has @:', hasAt);
				console.log('Has .:', hasDot);
				console.log('Has space:', hasSpace);
				
				const result = hasAt && hasDot && !hasSpace && email.length > 5;
				console.log('Simple validation result:', result);
				
				// Also try regex validation
				const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
				const regexResult = emailRegex.test(email);
				console.log('Regex test result:', regexResult);
				
				return result || regexResult;
			}

			function showError(message) {
				errorMessage.textContent = message;
				errorMessage.classList.add('show', 'enter');
				submitButton.disabled = false;
				submitButton.textContent = 'Start Assessment';
			}

			window.addEventListener('message', (event) => {
				const message = event.data;
				console.log('Received message from extension:', message);
				
				if (message.type === 'authError') {
					console.log('Authentication error:', message.message);
					showError(message.message);
				} else if (message.type === 'authSuccess') {
					console.log('Authentication successful');
					submitButton.textContent = 'Authentication Successful!';
					// keep button style minimal and consistent (white background, black text)
					// Automatically start assessment after successful auth
					setTimeout(() => {
						vscode.postMessage({
							type: 'startAssessment'
						});
					}, 1000);
				}
			});
		</script>
	</body>
	</html>
	`;
}

export function getProgressWebviewContent(): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>LodeAI - Building Assessment</title>
        <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', system-ui, Roboto, Helvetica, Arial, sans-serif;
            background: #000000;
            color: #ffffff;
            padding: 16px;
            margin: 0;
        }
            .container {
                width: 100%;
            }
            .logo {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                margin-bottom: 20px;
                position: relative;
                text-align: center;
            }
            .logo-text {
                font-family: 'Cubao', 'Inter', system-ui, sans-serif;
                font-size: 20px;
                font-weight: 800;
                letter-spacing: 0.3px;
                color: #ffffff;
            }
            .progress-container {
                background: rgba(255, 255, 255, 0.04);
                border: 1px solid rgba(255, 255, 255, 0.10);
                border-radius: 12px;
                padding: 22px;
            }
            .step-item {
                background: rgba(255, 255, 255, 0.04);
                border: 1px solid rgba(255, 255, 255, 0.10);
                border-radius: 10px;
                padding: 12px 16px;
                margin: 8px 0;
                display: flex;
                align-items: center;
                gap: 12px;
                animation: fadeSlideIn 150ms ease forwards;
                transition: all 0.2s ease;
            }
            .step-item.completed {
                background: rgba(34, 197, 94, 0.08);
                border-color: rgba(34, 197, 94, 0.2);
            }
            .step-item.in-progress {
                background: rgba(59, 130, 246, 0.08);
                border-color: rgba(59, 130, 246, 0.2);
            }
            .step-checkbox {
                width: 18px;
                height: 18px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                transition: all 0.2s ease;
            }
            .step-checkbox.completed {
                background: #22c55e;
                border-color: #22c55e;
            }
            .step-checkbox.in-progress {
                border-color: #3b82f6;
                background: rgba(59, 130, 246, 0.1);
            }
            .step-checkbox.completed::after {
                content: '✓';
                color: white;
                font-size: 12px;
                font-weight: bold;
            }
            .step-checkbox.in-progress::after {
                content: '';
                width: 8px;
                height: 8px;
                background: #3b82f6;
                border-radius: 50%;
                animation: pulse 1.5s ease-in-out infinite;
            }
            .step-text {
                flex: 1;
                font-size: 14px;
                color: #ffffff;
                line-height: 1.4;
            }
            .step-item.completed .step-text {
                color: #a7f3d0;
            }
            .step-item.in-progress .step-text {
                color: #93c5fd;
            }
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            .progress-bar {
                width: 100%;
                height: 8px;
                background: rgba(255, 255, 255, 0.12);
                border-radius: 999px;
                margin: 12px 0 14px;
                overflow: hidden;
                position: relative;
                box-shadow: none;
            }
            .progress-fill {
                height: 100%;
                background: #ffffff;
                border-radius: 999px;
                transition: width 0.35s ease;
                position: relative;
                overflow: hidden;
            }
            .progress-fill::after { display: none; }
            @keyframes shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }
            @keyframes fadeSlideIn {
                0% { opacity: 0; transform: translateY(3px); }
                100% { opacity: 1; transform: translateY(0); }
            }
            @media (prefers-reduced-motion: reduce) {
                * { animation: none !important; transition: none !important; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">
                <div class="logo-text">LodeAI</div>
            </div>
            <div class="progress-container">
            <h2 style="margin: 6px 0 10px; font-size: 18px; font-weight: 800; letter-spacing: 0.2px; color: #ffffff;">Building Your Assessment...</h2>
            <div class="progress-bar">
                <div class="progress-fill" id="progressFill" style="width: 0%"></div>
            </div>
            <div id="messages" style="max-height: 55vh; overflow: auto; padding-right: 2px;"></div>
        </div>
        
        <script>
            const vscode = acquireVsCodeApi();
            const messagesContainer = document.getElementById('messages');
            const progressFill = document.getElementById('progressFill');
            const steps = new Map();

            window.addEventListener('message', (event) => {
                const message = event.data;
                
                if (message.type === 'agentMessage') {
                    const stepId = message.payload.agent + '-' + message.payload.content.substring(0, 20);
                    
                    // Create or update step
                    if (!steps.has(stepId)) {
                        const stepElement = document.createElement('div');
                        stepElement.className = 'step-item';
                        stepElement.id = stepId;
                        stepElement.innerHTML = \`
                            <div class="step-checkbox"></div>
                            <div class="step-text">\${message.payload.content}</div>
                        \`;
                        messagesContainer.appendChild(stepElement);
                        steps.set(stepId, stepElement);
                    }
                    
                    const stepElement = steps.get(stepId);
                    const checkbox = stepElement.querySelector('.step-checkbox');
                    const text = stepElement.querySelector('.step-text');
                    
                    // Update step status based on level
                    if (message.payload.level === 'success' || message.payload.level === 'execute') {
                        stepElement.className = 'step-item completed';
                        checkbox.className = 'step-checkbox completed';
                        text.textContent = message.payload.content;
                    } else if (message.payload.level === 'info' || message.payload.level === 'plan') {
                        stepElement.className = 'step-item in-progress';
                        checkbox.className = 'step-checkbox in-progress';
                        text.textContent = message.payload.content;
                    } else {
                        stepElement.className = 'step-item';
                        checkbox.className = 'step-checkbox';
                        text.textContent = message.payload.content;
                    }
                    
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;

                    // Update progress bar
                    if (message.payload.progress !== undefined) {
                        progressFill.style.width = \`\${message.payload.progress}%\`;
                    }
                }
            });
        </script>
    </body>
    </html>`;
}