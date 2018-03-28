const config = {
     
    // Your private mailgun api_key and connected domain
    mailgun: {
        "api_key": "",
        "domain": ""
    },

    // Variables available: #{username} | #{email} | #{link}
    mail_templates: {
        // The email that gets sent when the user tries to preregister a username
        verification_sent: {
            from: "Bob <preregister@example.com>",
            subject: "Verify your preregistration at Example.com",
            body: `
            <html>
                <body>
                    <h1>Please click the link below to finish the preregistration</h1>
                    <a href="http://localhost:3000/activate/#{link}">Preregister #{username}</a>
                </body>
            </html>
            `,
            html_disabled_text: "Please view this email in an HTML supported client."
        },

        // The email that gets sent when the user successfully verifies through clicking the previous email link
        preregister_activated: {
            from: "Bob <preregister@example.com>",
            subject: "You have preregistered the username #{username}",
            body: `
            <html>
                <body>
                    <p>Congratulations, you have successfully locked the username <b>#{username}</b></p>
                    
                    <br>
                    <p>Your secret code:</p>
                    <h2>#{token}</h2>
                    <p>This code can be used to retrieve your username once we open up the site.</p>                    
                </body>
            </html>
            `,
            html_disabled_text: "Please view this email in an HTML supported client."
        }
        
    },

    outputs: {
        errors: {
            missing_input: "Username and email must be set",
            email_invalid: "Email is not in a valid format",
            username_invalid: "Username contains illegal characters, is formatted in an illegal way or is too short/long",
            username_taken: "Username already taken",
            email_already_used: "Email has already been used to preregister a username",
            already_asked_for_username: "You have already requested to preregister this username. Please check your email for a verification link.",
            mailgun_error: "Failed to send email",
            already_verified: "This activation link has already been verified",
            link_not_found: "Activation link does not exist"
        },
        success: {
            preregistered: "You successfully preregistered! An email has been sent to #{email} with further instructions.",
            verified: "You successfully locked the username #{username}"
        }
    }
}

module.exports = config;