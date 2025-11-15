# GitHub Actions Docker Setup

## Problem Fixed ✅

The error `invalid tag "/instagram-automation:pr-1"` was caused by a missing or empty `DOCKER_USERNAME` secret in your GitHub repository.

## What Was Changed

The workflow now:
1. Uses a fallback username (`local`) for pull requests when `DOCKER_USERNAME` is not set
2. Only pushes to Docker Hub when it's NOT a pull request AND the secret is configured
3. Loads the image locally for pull requests (for testing)

## Required GitHub Secrets

To enable Docker Hub publishing, you need to add these secrets to your GitHub repository:

### Step 1: Get Your Docker Hub Credentials

1. Go to https://hub.docker.com/
2. Sign in or create an account
3. Your username is visible in the top-right corner
4. For the password, create an access token:
   - Go to Account Settings → Security → Access Tokens
   - Click "New Access Token"
   - Name it "GitHub Actions"
   - Copy the token (you won't see it again!)

### Step 2: Add Secrets to GitHub

1. Go to your GitHub repository: https://github.com/Amaayu/Social-media-automaton
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add these two secrets:

   **Secret 1:**
   - Name: `DOCKER_USERNAME`
   - Value: Your Docker Hub username (e.g., `amaayu`)

   **Secret 2:**
   - Name: `DOCKER_PASSWORD`
   - Value: Your Docker Hub access token (from Step 1)

### Step 3: Test the Workflow

After adding the secrets:

1. Push a commit to the `main` or `master` branch
2. Go to **Actions** tab in your repository
3. Watch the workflow run
4. Your image will be pushed to: `docker.io/YOUR_USERNAME/instagram-automation`

## Workflow Behavior

### For Pull Requests:
- ✅ Builds the Docker image
- ✅ Tests that it builds successfully
- ❌ Does NOT push to Docker Hub
- Uses tag: `local/instagram-automation:pr-X`

### For Main/Master Branch:
- ✅ Builds the Docker image
- ✅ Pushes to Docker Hub (if secrets are configured)
- Uses tag: `YOUR_USERNAME/instagram-automation:latest`

### For Version Tags (v1.0.0):
- ✅ Builds the Docker image
- ✅ Pushes to Docker Hub with version tags
- Uses tags: 
  - `YOUR_USERNAME/instagram-automation:1.0.0`
  - `YOUR_USERNAME/instagram-automation:1.0`
  - `YOUR_USERNAME/instagram-automation:1`

## Manual Trigger

You can also manually trigger the workflow:

1. Go to **Actions** tab
2. Select "Build and Push to Docker Hub"
3. Click **Run workflow**
4. Choose the branch
5. Click **Run workflow**

## Troubleshooting

### "Error: buildx failed with: ERROR: failed to build"
- Check that your Dockerfile is valid
- Ensure all dependencies are available
- Review the build logs for specific errors

### "Error: denied: requested access to the resource is denied"
- Verify `DOCKER_USERNAME` and `DOCKER_PASSWORD` secrets are correct
- Make sure the Docker Hub access token has write permissions
- Check that you're logged in to Docker Hub

### Workflow doesn't push to Docker Hub
- Ensure you're pushing to `main` or `master` branch (not a PR)
- Verify both secrets are configured
- Check the workflow logs for authentication errors

## Current Status

✅ Workflow file fixed and merged to main branch
✅ Docker build error (mime package) fixed
⏳ Waiting for GitHub secrets to be configured
📦 Once configured, images will be available at: `docker.io/YOUR_USERNAME/instagram-automation`

## Pull Your Image

After the workflow runs successfully, anyone can pull your image:

```bash
# Pull latest version
docker pull YOUR_USERNAME/instagram-automation:latest

# Pull specific version
docker pull YOUR_USERNAME/instagram-automation:1.0.0

# Run the container
docker run -d -p 3000:3000 --env-file .env YOUR_USERNAME/instagram-automation:latest
```

## Next Steps

1. ✅ Code merged to main branch
2. ⏳ Add `DOCKER_USERNAME` and `DOCKER_PASSWORD` secrets to GitHub
3. ⏳ Push a commit or manually trigger the workflow
4. ⏳ Verify the image is published to Docker Hub
