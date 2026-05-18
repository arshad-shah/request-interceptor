# Security Policy

## Supported Versions

Only the latest release on `main` receives security updates.

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Report security issues privately via one of:

- GitHub's [private vulnerability reporting](https://github.com/arshad-shah/request-interceptor/security/advisories/new) for this repository.
- Email: **shaharshad57@gmail.com** with the subject prefix `[security] request-interceptor`.

Please include:

- A description of the issue and its potential impact.
- Steps to reproduce or a proof-of-concept.
- Affected versions if known.
- Any suggested mitigation.

You should receive a response within **5 business days**. If the report is accepted, we will work on a fix and coordinate disclosure with you. If declined, we will explain why.

## Scope

This extension requests broad permissions (`<all_urls>`, `debugger`, `cookies`, `scripting`, `storage`) because that is what an interception toolkit needs to function. Reports about the existence of these permissions, or about behavior available only when the user explicitly enables interception on a route they configured, are out of scope.

In-scope examples:

- Code that causes the extension to act on origins the user did not configure.
- XSS, prototype pollution, or sandbox escapes in the extension UI or content scripts.
- Leaks of intercepted data to third parties.
- Privilege escalation against the host browser.
