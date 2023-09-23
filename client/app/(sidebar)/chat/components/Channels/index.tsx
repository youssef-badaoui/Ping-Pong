import {
  AiFillPlusCircle,
  AiOutlineClose,
  AiOutlineMessage,
  AiOutlineSetting,
} from "react-icons/ai";

import UserCard from "../UserCard";
import { BsSearch } from "react-icons/Bs";
import { baseChatUrl, getRequest } from "@/app/context/utils/service";
import { Key, useEffect, useState } from "react";

import Modal from "react-modal";
import { Formik, Form, Field, ErrorMessage } from "formik";

import * as Yup from "yup";
import Image from "next/image";

import {
  List,
  ListItem,
  ListItemPrefix,
  Avatar,
  Card,
  Typography,
} from "@material-tailwind/react";

const Channels = ({ channels, setSelectedChat, setSelectedChannel }: any) => {
  const [isChecked, setIsChecked] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState([]);

  const handleClickUserMessage = async (channel: any) => {
    // const response = await postRequest( //TODO: ERROR IN
    //   `${baseChatUrl}/create/dm`,
    //   JSON.stringify({ username: user.username, memberLimit: 2 })
    // );
    // replacing create/dm with get channel
    const response = await getRequest(
      `${baseChatUrl}/getChannel/${channel.id}`
    );
    setSelectedChat(channel);
    setSelectedChannel(response);
  };

  useEffect(() => {
    setSelectedChannels(
      channels?.filter((ch: any) =>
        !isChecked ? ch?.type === "dm" : ch?.type === "room"
      )
    );
  }, [isChecked]);

  return (
    <div className="users-container">
      <div className="inbox-header">
        <span className="text-white">inbox</span>
        <AiOutlineSetting />
      </div>
      <div className="mb-4">
        <form>
          <label className="mb-2 text-sm font-medium text-gray-900 sr-only dark:text-white">
            Search
          </label>
          <div className="relative">
            <input
              type="search"
              id="default-search"
              className="block w-full p-4 pl-10 text-sm text-white rounded-3xl bg-[#1F1F1F] focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 "
              placeholder="Search..."
            />
            <div className="absolute text-white inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <BsSearch />
            </div>
          </div>
        </form>
      </div>

      <ChannelsSwitcher isChecked={isChecked} setIsChecked={setIsChecked} />

      <div>
        <AddNewChannel isChecked={isChecked} />
        {selectedChannels.length > 0 &&
          selectedChannels?.map((channel: any, index: Number) => {
            return (
              <UserCard
                channel={channel}
                key={index}
                onClick={() => handleClickUserMessage(channel)}
              />
            );
          })}
      </div>
    </div>
  );
};

const ChannelsSwitcher = ({ isChecked, setIsChecked }: any) => {
  const handleCheckboxChange = () => {
    setIsChecked(!isChecked);
  };

  return (
    <label className="w-full themeSwitcherTwo items-center shadow-card inline-flex cursor-pointer text-white select-none  justify-around rounded-md bg-[#1F0D3C] p-1">
      <input
        type="checkbox"
        className="sr-only"
        checked={isChecked}
        onChange={handleCheckboxChange}
      />
      <span
        className={`flex items-center justify-center w-[50%] space-x-[6px] rounded py-2 text-sm font-medium ${
          !isChecked ? "text-primary bg-[#654795]" : "text-body-color"
        }`}
      >
        Dm's
      </span>
      <span
        className={`flex items-center justify-center w-[50%] space-x-[6px] rounded py-2 text-sm font-medium ${
          isChecked ? "text-primary bg-[#654795]" : "text-body-color"
        }`}
      >
        Rooms
      </span>
    </label>
  );
};

const AddNewChannel = ({ isChecked }: any) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => {
    setIsOpen(!isOpen);
  };
  return (
    <>
      <button
        className="mt-3 flex justify-center items-center gap-3 block text-white bg-[#654795] focus:outline-none font-medium rounded-3xl text-sm px-5 py-2.5 text-center"
        type="button"
        onClick={handleOpen}
      >
        <AiFillPlusCircle /> {!isChecked ? "Create New DM" : "Create New Room"}
      </button>
      <ModalContainer
        isOpen={isOpen}
        handleOpen={handleOpen}
        typeModal={isChecked ? "room" : "dm"}
      />
    </>
  );
};

interface FormValues {
  name: string;
  type: string;
  password: string;
  avatar: File | null | string; // Change the type to File | null for file input
}

const validationSchema = Yup.object().shape({
  name: Yup.string().required("Name is required"),
  type: Yup.string().required("Type is required"),
  password: Yup.string()
    .test(
      "password-required",
      "Password is required when type is protected",
      function (value) {
        // 'this' refers to the current Yup validation context
        const type = this.parent.type;
        if (type === "protected") {
          return !!value;
        }
        return true; // Password is not required for other types
      }
    )
    .min(6, "Password must be at least 6 characters"),
  avatar: Yup.mixed()
    .test("fileSize", "File size is too large", (value: any) => {
      if (!value) return true; // No file selected is fine
      return value.size <= 1024 * 1024; // 1 MB
    })
    .test(
      "fileType",
      "Invalid file type. Only image files allowed.",
      (value: any) => {
        if (!value) return true; // No file selected is fine
        return ["image/jpeg", "image/png", "image/gif"].includes(value.type);
      }
    ),
});

const initialValues: FormValues = {
  name: "",
  type: "",
  password: "",
  avatar: "",
};

const ModalContainer = ({ isOpen, handleOpen, typeModal }: any) => {
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null); // State to store the avatar image URL


  const customStyles = {
    content: {
      top: "50%",
      left: "50%",
      right: "auto",
      bottom: "auto",
      marginRight: "-50%",
      transform: "translate(-50%, -50%)",
      width: "500px",
      maxWidth: "500px",
    },
  };
  Modal.setAppElement("div");

  const handleSubmit = (values: FormValues, { resetForm }: any) => {
    // Handle form submission here
    console.log(values);
    resetForm();
  };

  return (
    <Modal isOpen={isOpen} style={customStyles} contentLabel="Modal">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-bold">{typeModal === 'room' ? "Create a room chat" : "Create a Dm with a friend"}</h2>
        <AiOutlineClose className={"cursor-pointer"} onClick={() => {
          setAvatarPreview(null);
          handleOpen();
        }} />
      </div>
      <hr className="h-1 mx-auto bg-[#654795] border-0 rounded my-8 dark:bg-gray-700"/>
      <div>
        {typeModal === "room" ? (
          <>
            <Formik
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
              {({ handleSubmit, isSubmitting, setFieldValue, values }) => (
                <Form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-gray-700 font-medium">
                      Name
                    </label>
                    <Field
                      type="text"
                      name="name"
                      id="name"
                      placeholder="Enter your name"
                      className="border border-gray-300 rounded w-full px-3 py-2 my-2"
                    />
                    <ErrorMessage
                      name="name"
                      component="div"
                      className="text-red-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="type" className="block text-gray-700 font-medium">
                      Type
                    </label>
                    <Field
                      as="select" // Use "as" to render a select dropdown
                      name="type"
                      id="type"
                      className="border border-gray-300 rounded w-full px-3 py-2 my-2"
                    >
                      <option value="">Select type of this room</option>
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                      <option value="protected">Protected</option>
                    </Field>
                    <ErrorMessage
                      name="type"
                      component="div"
                      className="text-red-500"
                    />
                  </div>

                  {values.type === "protected" && (
                    <div>
                      <label htmlFor="password" className="block text-gray-700 font-medium">
                        Password
                      </label>
                      <Field
                        type="password"
                        name="password"
                        id="password"
                        placeholder="Enter your password"
                        className="border border-gray-300 rounded w-full px-3 py-2 my-2"
                      />
                      <ErrorMessage
                        name="password"
                        component="div"
                        className="text-red-500"
                      />
                    </div>
                  )}

                  <div>
                    <div className="mt-2 flex justify-start items-center">
                      {avatarPreview &&
                        <Image
                          src={avatarPreview}
                          alt="Avatar"
                          width={50}
                          height={50}
                          className="mr-3 rounded-3xl"
                        />
                      }
                      <input
                        type="file"
                        id="avatar"
                        name="avatar"
                        accept="image/jpeg, image/png, image/gif"
                        className="hidden" // Hide the default file input
                        onChange={(
                          event: React.ChangeEvent<HTMLInputElement>
                        ) => {
                          const file =
                            event.target.files && event.target.files[0];
                          if (file) {
                            setFieldValue("avatar", file); // Set the file value when a file is selected
                            setAvatarPreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                      <label
                        htmlFor="avatar"
                        className="cursor-pointer bg-[#654795] text-white rounded px-4 py-2 hover:bg-[#654795]"
                      >
                        Select Avatar
                      </label>
                    </div>
                    <ErrorMessage
                      name="avatar"
                      component="div"
                      className="text-red-500"
                    />
                  </div>

                  <div className="w-full flex justify-end">
                    <button
                      type="submit"
                      className="bg-[#654795] text-white rounded px-4 py-2"
                      disabled={isSubmitting}
                    >
                      Submit
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </>
        ) : (
          <>
          {/* TODO: get all friends here ?? Todo or not*/}
          
          </>
        )}
      </div>
    </Modal>
  );
};

export default Channels;