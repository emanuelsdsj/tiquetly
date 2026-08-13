FROM mcr.microsoft.com/devcontainers/python:1-3.12-bookworm

# The base image ships a yarn apt source (dl.yarnpkg.com) whose signing key
# fails GPG verification, which breaks apt-get update for any feature
# (docker-in-docker included) before it even touches its own packages.
RUN rm -f /etc/apt/sources.list.d/yarn.list
