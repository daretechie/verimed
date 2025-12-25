from setuptools import setup, find_packages

setup(
    name="verimed-sdk",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        "requests>=2.25.0",
    ],
    author="VeriMed Team",
    author_email="support@verimed.app",
    description="Official Python SDK for VeriMed Medical Provider Verification API",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    url="https://github.com/daretechie/verimed",
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires='>=3.7',
)
