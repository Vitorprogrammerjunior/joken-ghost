"""
Setup script para JokenGhost - Caçada em Turnos
"""

from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

with open("requirements.txt", "r", encoding="utf-8") as fh:
    requirements = [line.strip() for line in fh if line.strip() and not line.startswith("#")]

setup(
    name="jokenghost-cacada-em-turnos",
    version="1.0.0",
    author="Desenvolvedor JokenGhost",
    description="Um jogo de RPG estilo Pokémon com mecânicas de pedra-papel-tesoura",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/seu-usuario/jokenghost-cacada-em-turnos",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: End Users/Desktop",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Games/Entertainment :: Role-Playing",
    ],
    python_requires=">=3.8",
    install_requires=requirements,
    entry_points={
        "console_scripts": [
            "jokenghost=jokenghost:main",
        ],
    },
    include_package_data=True,
    package_data={
        "": ["Assests/Sprites/**/*.png"],
    },
)
